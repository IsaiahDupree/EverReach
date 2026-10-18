#!/usr/bin/env node

// Clean up Vercel deployments in ERROR (optionally CANCELED) state.
// Safety-first: defaults to dry-run. Pass --apply to actually delete.
//
// Requirements:
// - Node 18+ (global fetch available)
// - Environment: VERCEL_TOKEN (required)
// - Optional env: VERCEL_TEAM_ID, VERCEL_PROJECT_ID
//
// Usage examples:
//   node scripts/clean-vercel-errored-deployments.mjs --project my-backend --apply
//   node scripts/clean-vercel-errored-deployments.mjs --projectId prj_abc123 --team team_123 --limit 100
//   node scripts/clean-vercel-errored-deployments.mjs --includeCanceled --olderThanHours 1 --dry-run

const BASE = "https://api.vercel.com";

function parseArgs(argv) {
  const out = { dryRun: true, includeCanceled: false, limit: 100, olderThanHours: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const val = (k) => {
      const v = argv[i + 1];
      if (!v || v.startsWith("--")) throw new Error(`Missing value for ${k}`);
      i++;
      return v;
    };
    if (a === "--apply") out.dryRun = false;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--includeCanceled") out.includeCanceled = true;
    else if (a === "--token") out.token = val("--token");
    else if (a === "--project") out.project = val("--project"); // slug or name
    else if (a === "--projectId") out.projectId = val("--projectId");
    else if (a === "--team") out.teamId = val("--team");
    else if (a === "--limit") out.limit = Number(val("--limit"));
    else if (a === "--olderThanHours") out.olderThanHours = Number(val("--olderThanHours"));
    else if (a === "--state") out.state = val("--state"); // advanced override
    else if (a === "--maxDelete") out.maxDelete = Number(val("--maxDelete"));
    else if (a === "--url") out.url = val("--url");
    else if (a === "--json") out.json = true;
  }
  return out;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(path, { method = "GET", token, teamId, body } = {}) {
  const qs = [];
  if (teamId) qs.push(["teamId", teamId]);
  const url = `${BASE}${path}${qs.length ? "?" + qs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // Respect Vercel rate limit (429) by waiting until reset and retrying once.
    if (res.status === 429) {
      let waitMs = 120000; // default 2 minutes
      try {
        const data = await res.json();
        const reset = data?.error?.limit?.reset; // epoch seconds
        const candidate = reset ? reset * 1000 - Date.now() : 0;
        if (candidate > 0) waitMs = candidate + 1000; // small buffer
        console.log(`⏳ Rate limited on ${method} ${path}. Waiting ${Math.ceil(waitMs / 1000)}s before retry...`);
      } catch {
        console.log(`⏳ Rate limited on ${method} ${path}. Waiting ${Math.ceil(waitMs / 1000)}s (default) before retry...`);
      }
      await sleep(waitMs);
      const retryRes = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retryRes.ok) {
        const retryText = await retryRes.text();
        throw new Error(`${method} ${path} failed after retry: ${retryRes.status} ${retryRes.statusText} - ${retryText}`);
      }
      const retryType = retryRes.headers.get("content-type") || "";
      if (retryType.includes("application/json")) return retryRes.json();
      return retryRes.text();
    }
    const text = await res.text();
    throw new Error(`${method} ${path} failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

async function getProjectId({ token, teamId, project, projectId }) {
  if (projectId) return projectId;
  if (!project) return undefined;
  // Look up project by slug or name
  try {
    const p = await api(`/v9/projects/${encodeURIComponent(project)}`, { token, teamId });
    return p.id || p.projectId || p.uid;
  } catch (e) {
    // Fallback: list and find
    const list = await api(`/v9/projects`, { token, teamId });
    const found = (list.projects || list)?.find((p) => p?.name === project || p?.slug === project || p?.id === project);
    return found?.id;
  }
}

function filterByAge(deployments, olderThanHours) {
  if (!olderThanHours || olderThanHours <= 0) return deployments;
  const cutoff = Date.now() - olderThanHours * 3600 * 1000;
  return deployments.filter((d) => {
    const ts = d?.createdAt || d?.created || d?.created_at;
    return typeof ts === "number" ? ts < cutoff : Date.parse(ts) < cutoff;
  });
}

(async () => {
  try {
    const args = parseArgs(process.argv);
    const token = args.token || process.env.VERCEL_TOKEN;
    if (!token) throw new Error("Missing required token: provide --token or set VERCEL_TOKEN env var");
    const teamId = args.teamId || process.env.VERCEL_TEAM_ID;
    const explicitProjectId = args.projectId || process.env.VERCEL_PROJECT_ID;

    if (!args.project && !explicitProjectId) {
      console.log("ℹ️  No --project or --projectId provided. Will scan latest deployments across all projects.");
    }

    // If a specific deployment URL is provided, fetch it directly and print details
    if (args.url) {
      const dep = await api(`/v6/deployments/get?url=${encodeURIComponent(args.url)}`, { token, teamId });
      const id = dep?.id || dep?.uid;
      const url = dep?.url;
      const state = dep?.state;
      const target = dep?.target; // production | preview
      const meta = dep?.meta || {};
      const git = dep?.gitSource || dep?.gitMetadata || {};
      const ref = meta.githubCommitRef || git.ref || meta.branch || git.branch || null;
      const sha = meta.githubCommitSha || git.sha || null;
      const projectIdFromDep = dep?.projectId || dep?.project?.id;
      const outData = { id, url, state, target, ref, sha, projectId: projectIdFromDep };
      if (args.json) {
        console.log(JSON.stringify(outData, null, 2));
      } else {
        console.log("Deployment Info:\n", outData);
      }
      process.exit(0);
    }

    const projectId = await getProjectId({ token, teamId, project: args.project, projectId: explicitProjectId });

    // List recent deployments (limit up to 100)
    // v6 is the supported version for deployments list/delete endpoints
    const list = await api(`/v6/deployments?limit=${Math.max(1, Math.min(100, args.limit || 100))}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}`, { token, teamId });
    const deployments = list.deployments || list || [];

    if (!Array.isArray(deployments)) throw new Error("Unexpected deployments response format");

    const states = new Set(["ERROR", ...(args.includeCanceled ? ["CANCELED"] : [])]);
    const toDeleteRaw = deployments.filter((d) => states.has(String(d?.state || "").toUpperCase()));
    const toDelete = filterByAge(toDeleteRaw, args.olderThanHours);

    console.log(`🔎 Found ${toDelete.length} deployments to delete out of ${deployments.length} fetched`);
    if (toDelete.length > 0) {
      console.table(toDelete.map((d) => ({ id: d.id || d.uid, url: d.url, state: d.state, createdAt: d.createdAt })));
    }

    if (args.dryRun) {
      console.log("✅ Dry run: no deletions performed. Use --apply to delete.");
      process.exit(0);
    }

    let ok = 0, fail = 0;
    for (const d of toDelete) {
      const id = d.id || d.uid;
      if (!id) { fail++; continue; }
      try {
        await api(`/v6/deployments/${encodeURIComponent(id)}`, { method: "DELETE", token, teamId });
        console.log(`🗑️  Deleted ${id} (${d.url || ""})`);
        ok++;
        if (args.maxDelete && ok >= args.maxDelete) {
          console.log(`Reached maxDelete=${args.maxDelete}, stopping deletions.`);
          break;
        }
      } catch (e) {
        console.error(`❌ Failed to delete ${id}:`, e.message || e);
        fail++;
      }
    }

    console.log(`
Summary: deleted=${ok}, failed=${fail}, dryRun=${args.dryRun}
`);
    process.exit(fail > 0 ? 1 : 0);
  } catch (e) {
    console.error("✖ Script error:", e?.message || e);
    process.exit(1);
  }
})();
