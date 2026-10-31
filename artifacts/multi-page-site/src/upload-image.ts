import type { PortfolioImageUploadResponse } from "@workspace/api-client-react";

/** Upload directly to storage, avoiding Netlify Function binary body limits. */
export async function uploadImageFile(
  upload: PortfolioImageUploadResponse,
  file: File,
) {
  let response: Response;
  if (upload.uploadFields) {
    const body = new FormData();
    for (const [name, value] of Object.entries(upload.uploadFields)) {
      body.append(name, value);
    }
    body.append("file", file);
    response = await fetch(upload.uploadUrl, { method: "POST", body });
  } else {
    response = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  }
  if (!response.ok) {
    throw new Error("Зургийг хадгалж чадсангүй. Хадгалалтын тохиргоо болон зургийн форматыг шалгаад дахин оролдоно уу.");
  }
}
