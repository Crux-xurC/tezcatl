defmodule CitlalpolRecords do
  @moduledoc """
  Citlalpol's records, read-only, for the citlalpol_bus panel (D-citlalpol-bus).

  Citlalpol (another program: the fake outside behind forbidden's door) appends one JSON
  line per attempt to `<state>/records/<YYYY-MM-DD>.jsonl`. This reads them as files and
  nothing else: no connection to Citlalpol, never through its door -- so looking at the
  records makes no record, and nothing goes back toward the wall. The lines are JSON
  (structure), passed on as decoded; their strings are the wall's program's and the page
  shows them as text.

  A cursor is `<day>:<byte offset>`. Without one, the last `@first` records of the newest
  day; with one, what was added since, going on into a newer day when there is one.
  """

  @first 200
  @max_bytes 262_144
  @day ~r/\A\d{4}-\d{2}-\d{2}\z/

  def state_dir do
    System.get_env("CITLALPOL_STATE") ||
      Path.join(System.get_env("XDG_DATA_HOME") || Path.expand("~/.local/share"), "citlalpol")
  end

  def runtime_dir do
    System.get_env("CITLALPOL_RUNTIME") ||
      Path.join(System.get_env("XDG_RUNTIME_DIR") || "/run/user/#{uid()}", "citlalpol")
  end

  defp uid do
    case File.stat("/proc/self") do
      {:ok, %{uid: u}} -> u
      _ -> 0
    end
  end

  @doc "is citld running (its pid file names a living process)?"
  def citld_alive?(runtime \\ runtime_dir()) do
    with {:ok, s} <- File.read(Path.join(runtime, "citld.pid")),
         {pid, _} <- Integer.parse(String.trim(s)) do
      File.exists?("/proc/#{pid}")
    else
      _ -> false
    end
  end

  @doc "the days there are, oldest first"
  def days(dir) do
    case File.ls(Path.join(dir, "records")) do
      {:ok, names} ->
        names
        |> Enum.filter(&String.ends_with?(&1, ".jsonl"))
        |> Enum.map(&String.trim_trailing(&1, ".jsonl"))
        |> Enum.filter(&Regex.match?(@day, &1))
        |> Enum.sort()

      _ ->
        []
    end
  end

  @doc "a cursor string -> {day, offset} | nil (anything else is no cursor)"
  def parse_cursor(c) when is_binary(c) do
    with [day, off] <- String.split(c, ":", parts: 2),
         true <- Regex.match?(@day, day),
         {n, ""} when n >= 0 <- Integer.parse(off) do
      {day, n}
    else
      _ -> nil
    end
  end

  def parse_cursor(_), do: nil

  @doc """
  read(dir, cursor) -> %{"records" => [map], "cursor" => string | nil}
  """
  def read(dir, cursor) do
    ds = days(dir)

    case {ds, parse_cursor(cursor)} do
      {[], _} ->
        %{"records" => [], "cursor" => nil}

      {_, nil} ->
        day = List.last(ds)
        {lines, size} = whole(dir, day)
        %{"records" => lines |> Enum.take(-@first) |> decode(), "cursor" => "#{day}:#{size}"}

      {_, {day, off}} ->
        since(dir, ds, day, off, [])
    end
  end

  defp file(dir, day), do: Path.join([dir, "records", day <> ".jsonl"])

  defp whole(dir, day) do
    case File.read(file(dir, day)) do
      {:ok, bin} -> {complete_lines(bin), byte_size(bin) - byte_size(tail_partial(bin))}
      _ -> {[], 0}
    end
  end

  # from (day, off) on; a newer day is read from its start once this one is done
  defp since(dir, ds, day, off, acc) do
    {lines, next_off} = from(dir, day, off)
    acc = acc ++ decode(lines)
    newer = Enum.find(ds, &(&1 > day))

    cond do
      newer && byte_size_of(dir, day) == next_off -> since(dir, ds, newer, 0, acc)
      true -> %{"records" => acc, "cursor" => "#{day}:#{next_off}"}
    end
  end

  defp byte_size_of(dir, day) do
    case File.stat(file(dir, day)) do
      {:ok, %{size: s}} -> s
      _ -> 0
    end
  end

  defp from(dir, day, off) do
    case File.open(file(dir, day), [:read, :binary]) do
      {:ok, f} ->
        size = byte_size_of(dir, day)
        # a file shorter than the cursor (started again): from its start
        off = if off > size, do: 0, else: off
        {:ok, _} = :file.position(f, off)

        bin =
          case IO.binread(f, @max_bytes) do
            b when is_binary(b) -> b
            _ -> ""
          end

        File.close(f)
        whole_part = binary_part(bin, 0, byte_size(bin) - byte_size(tail_partial(bin)))
        {complete_lines(whole_part), off + byte_size(whole_part)}

      _ ->
        {[], off}
    end
  end

  # what follows the last newline (a line still being written)
  defp tail_partial(bin) do
    case :binary.matches(bin, "\n") do
      [] -> bin
      ms -> {pos, 1} = List.last(ms); binary_part(bin, pos + 1, byte_size(bin) - pos - 1)
    end
  end

  defp complete_lines(bin) do
    bin
    |> binary_part(0, byte_size(bin) - byte_size(tail_partial(bin)))
    |> String.split("\n", trim: true)
  end

  defp decode(lines) do
    Enum.flat_map(lines, fn l ->
      try do
        case :json.decode(l) do
          m when is_map(m) -> [m]
          _ -> []
        end
      rescue
        _ -> []
      end
    end)
  end
end

defmodule CitlalpolHandler do
  @moduledoc """
  GET /citlalpol/records[?cursor=<day>:<offset>] -> {"records": [...], "cursor": ..., "citld": bool, "dir": ...}
  Read-only (GET and OPTIONS only); CORS-permissive like GET /env. D-citlalpol-bus.
  """

  def init(req0, state) do
    origin = :cowboy_req.header("origin", req0, :undefined)

    req =
      case :cowboy_req.method(req0) do
        "GET" ->
          qs = :cowboy_req.parse_qs(req0)
          cursor = :proplists.get_value("cursor", qs, nil)
          dir = CitlalpolRecords.state_dir()

          body =
            CitlalpolRecords.read(dir, if(is_binary(cursor), do: cursor, else: nil))
            |> Map.merge(%{"citld" => CitlalpolRecords.citld_alive?(), "dir" => Path.join(dir, "records")})

          json(200, body, origin, req0)

        "OPTIONS" ->
          :cowboy_req.reply(204, cors(%{}, origin, "GET, OPTIONS"), "", req0)

        _ ->
          json(405, %{"error" => "read only"}, origin, req0)
      end

    {:ok, req, state}
  end

  defp cors(h, origin, methods) do
    case AllowedOrigins.acao(origin) do
      nil -> Map.put(h, "vary", "origin")
      allowed -> Map.merge(h, %{"vary" => "origin", "access-control-allow-origin" => allowed, "access-control-allow-methods" => methods})
    end
  end

  defp json(status, map, origin, req) do
    headers = cors(%{"content-type" => "application/json; charset=utf-8", "cache-control" => "no-store"}, origin, "GET, OPTIONS")
    :cowboy_req.reply(status, headers, IO.iodata_to_binary(:json.encode(map)), req)
  end
end
