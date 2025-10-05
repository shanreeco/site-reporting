import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

export function usePublicDailyTasks() {
  const [tasks, setTasks] = useState([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasksForDate = useCallback(async (taskDate) => {
    if (!taskDate) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error: tasksError } = await supabase
      .from("daily_tasks")
      .select(
        "id,title,status,remarks,updated_at,updated_by,task_date,updated_by_profile:profiles!daily_tasks_updated_by_fkey(full_name,email)"
      )
      .eq("task_date", taskDate)
      .order("created_at", { ascending: true });

    if (tasksError) {
      setError(tasksError.message);
      setTasks([]);
    } else {
      setError("");
      setTasks(data || []);
    }

    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: latestDate, error: latestError } = await supabase
      .from("daily_tasks")
      .select("task_date")
      .order("task_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      setError(latestError.message);
      setTasks([]);
      setDate("");
      setLoading(false);
      return;
    }

    const taskDate = latestDate?.task_date || "";
    setDate(taskDate);
    await loadTasksForDate(taskDate);
  }, [loadTasksForDate]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("public-daily-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tasks" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const hasData = useMemo(() => tasks.length > 0, [tasks]);

  return { tasks, date, loading, error, refresh, hasData };
}
