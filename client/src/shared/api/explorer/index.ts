export type PickFolderResult = {
  path: string | null;
  cancelled: boolean;
};

async function readErrorText(response: Response): Promise<string> {
  try {
    const data = (await response.json().catch(() => null)) as any;
    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error.trim())
        return data.error;
      if (typeof data.message === "string" && data.message.trim())
        return data.message;
    }
  } catch {
    // ignore
  }

  const txt = (await response.text().catch(() => "")).trim();
  return txt;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    const errText = await readErrorText(response);
    if (errText) throw new Error(errText);
    throw new Error(response.statusText);
  }

  return response.json() as Promise<T>;
}

export async function showFolder(path: string): Promise<void> {
  await postJson<{ ok: true }>("/api/explorer/show-folder", { path });
}

export async function showFile(path: string): Promise<void> {
  await postJson<{ ok: true }>("/api/explorer/show-file", { path });
}

export async function pickFolder(title?: string): Promise<PickFolderResult> {
  return postJson<PickFolderResult>("/api/explorer/pick-folder", {
    ...(title ? { title } : {}),
  });
}
