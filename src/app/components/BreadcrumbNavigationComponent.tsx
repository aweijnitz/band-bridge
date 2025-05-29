"use client";
import Link from 'next/link';

export default function BreadcrumbNavigationComponent({ projectId, projectName, songId, songTitle }: {
  projectId?: string;
  projectName?: string;
  songId?: string;
  songTitle?: string;
}) {
  return (
    <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
      <ol className="list-reset flex items-center gap-2">
        <li>
          <Link href="/dashboard" className="text-zinc-800 hover:underline">Dashboard</Link>
        </li>
        {projectId && (
          <>
            <li><span className="mx-2">/</span></li>
            <li>
              <Link href={`/project/${projectId}`} className="text-zinc-800 hover:underline">
                {projectName ? projectName : `Project #${projectId}`}
              </Link>
            </li>
          </>
        )}
        {songId && (
          <>
            <li><span className="mx-2">/</span></li>
            <li className="text-zinc-800">{songTitle ? songTitle : `Song #${songId}`}</li>
          </>
        )}
      </ol>
    </nav>
  );
} 