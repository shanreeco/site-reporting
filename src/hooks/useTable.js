import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export function useTable(table) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setError(fetchError?.message || "");
    setLoading(false);
  }, [table]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`${table}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, table]);

  const insert = useCallback(
    async (row) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error: insertError } = await supabase
        .from(table)
        .insert({ ...row, user_id: user?.id });
      if (insertError) alert(insertError.message);
    },
    [table]
  );

  const remove = useCallback(
    async (id) => {
      const { error: deleteError } = await supabase.from(table).delete().eq("id", id);
      if (deleteError) alert(deleteError.message);
    },
    [table]
  );

  const clearAll = useCallback(async () => {
    if (!window.confirm("Delete ALL records?")) return;
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) alert(deleteError.message);
  }, [table]);

  return { rows, loading, error, insert, remove, clearAll, refresh };
}
