import { useCallback, useEffect, useState } from "react";
import { MISCONFIGURED, supabase } from "../services/supabase";
import { sampleProjects } from "../services/sampleData";

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [usingSampleData, setUsingSampleData] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (MISCONFIGURED) {
        setProjects(sampleProjects);
        setUsingSampleData(true);
        setNotice(
          "Supabase credentials are not configured. Displaying curated sample projects.",
        );
        return;
      }

      const { data, error: queryError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setProjects(data ?? []);
      setUsingSampleData(false);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      setError(err.message ?? "Unable to load projects");

      let fallbackApplied = false;
      setProjects((current) => {
        if (current.length > 0) return current;
        if (sampleProjects.length > 0) {
          fallbackApplied = true;
          return sampleProjects;
        }
        return current;
      });
      if (fallbackApplied) {
        setUsingSampleData(true);
        setNotice("Showing sample projects while we reconnect to the database.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    error,
    notice,
    usingSampleData,
    refresh: loadProjects,
  };
}
