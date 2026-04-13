import type { Octokit } from 'octokit';
import type { PrRef } from './parse-pr-url';

export interface PrFile {
  filename: string;
  status: string;
  patch?: string;
}

export interface PrTreeEntry {
  path: string;
  type: string;
}

export interface PrData {
  pr: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    author: string;
    headSha: string;
    headRef: string;
    description: string;
  };
  files: PrFile[];
  repoTree: PrTreeEntry[];
}

export async function fetchPrData(octokit: Octokit, ref: PrRef): Promise<PrData> {
  const { owner, repo, number } = ref;

  const [prResponse, filesResponse] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: number }),
    octokit.rest.pulls.listFiles({ owner, repo, pull_number: number }),
  ]);

  if (filesResponse.data.length > 100) {
    throw new Error('too many changed files');
  }

  const headSha = prResponse.data.head.sha;
  const headRef = prResponse.data.head.ref;

  const treeResponse = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: headSha,
    recursive: 'true',
  });

  const files: PrFile[] = filesResponse.data.map((f) => ({
    filename: f.filename,
    status: f.status,
    ...(f.patch !== undefined ? { patch: f.patch } : {}),
  }));

  const repoTree: PrTreeEntry[] = treeResponse.data.tree
    .filter((entry) => entry.path !== undefined && entry.type !== undefined)
    .map((entry) => ({
      path: entry.path as string,
      type: entry.type as string,
    }));

  return {
    pr: {
      owner,
      repo,
      number,
      title: prResponse.data.title,
      author: prResponse.data.user?.login ?? '',
      headSha,
      headRef,
      description: prResponse.data.body ?? '',
    },
    files,
    repoTree,
  };
}
