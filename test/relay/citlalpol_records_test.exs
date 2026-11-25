ExUnit.start()
Code.require_file("../../lib/relay/allowed_origins.exs", __DIR__)
Code.require_file("../../lib/relay/citlalpol_records.exs", __DIR__)

defmodule CitlalpolRecordsTest do
  # Citlalpol's records read as files (D-citlalpol-bus): the last ones first, then what
  # was added since a cursor, across a new day, never half a line.
  use ExUnit.Case, async: true

  setup do
    dir = Path.join(System.tmp_dir!(), "citlalpol-records-#{System.unique_integer([:positive])}")
    File.mkdir_p!(Path.join(dir, "records"))
    on_exit(fn -> File.rm_rf!(dir) end)
    {:ok, dir: dir}
  end

  defp put(dir, day, text), do: File.write!(Path.join([dir, "records", day <> ".jsonl"]), text, [:append])

  test "no records: none, no cursor", %{dir: dir} do
    assert CitlalpolRecords.read(dir, nil) == %{"records" => [], "cursor" => nil}
  end

  test "the newest day's records first, then only what was added; a half-written line waits", %{dir: dir} do
    put(dir, "2026-11-23", ~s({"host":"old"}\n))
    put(dir, "2026-11-24", ~s({"host":"a"}\n{"host":"b"}\n{"host":"c"))
    r = CitlalpolRecords.read(dir, nil)
    assert Enum.map(r["records"], & &1["host"]) == ["a", "b"]
    assert r["cursor"] == "2026-11-24:26"
    put(dir, "2026-11-24", ~s(}\nnot json\n{"host":"d"}\n))
    r2 = CitlalpolRecords.read(dir, r["cursor"])
    assert Enum.map(r2["records"], & &1["host"]) == ["c", "d"]
    assert CitlalpolRecords.read(dir, r2["cursor"])["records"] == []
  end

  test "a cursor at the end of a day goes on into the newer one", %{dir: dir} do
    put(dir, "2026-11-24", ~s({"host":"a"}\n))
    c = CitlalpolRecords.read(dir, nil)["cursor"]
    put(dir, "2026-11-25", ~s({"host":"next"}\n))
    r = CitlalpolRecords.read(dir, c)
    assert Enum.map(r["records"], & &1["host"]) == ["next"]
    assert String.starts_with?(r["cursor"], "2026-11-25:")
  end

  test "only <day>:<offset> is a cursor (no path can be named)" do
    assert CitlalpolRecords.parse_cursor("2026-11-24:10") == {"2026-11-24", 10}
    assert CitlalpolRecords.parse_cursor("../../etc/passwd:0") == nil
    assert CitlalpolRecords.parse_cursor("2026-11-24:-1") == nil
    assert CitlalpolRecords.parse_cursor("2026-11-24") == nil
  end

  test "citld: alive only when its pid file names a living process", %{dir: dir} do
    refute CitlalpolRecords.citld_alive?(dir)
    File.write!(Path.join(dir, "citld.pid"), "#{System.pid()}")
    assert CitlalpolRecords.citld_alive?(dir)
    File.write!(Path.join(dir, "citld.pid"), "999999999")
    refute CitlalpolRecords.citld_alive?(dir)
  end
end
