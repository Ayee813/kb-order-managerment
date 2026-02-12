import { Handlers } from "$fresh/server.ts";
import {
  appendSheetRow,
  deleteSheetRow,
  fetchLatestSheetData,
  fetchSheetData,
  getPrintDataAndArchive,
  updateSheetRow,
  uploadImageToDrive,
} from "../../common/google_integration.ts";

export const handler: Handlers = {
  /**
   * GET /api/google
   * Actions: list, latest
   */
  async GET(req, _ctx) {
    try {
      const url = new URL(req.url);
      const action = url.searchParams.get("action") || "latest";

      if (action === "list") {
        const range = url.searchParams.get("range") || "A1:Z1000";
        const data = await fetchSheetData(range);
        return new Response(JSON.stringify({ data }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await fetchLatestSheetData();
      return new Response(JSON.stringify({ data }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Google Sheets Fetch Error:", error);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  /**
   * POST /api/google
   * Actions: archive (default), create
   */
  async POST(req, _ctx) {
    try {
      const url = new URL(req.url);
      const action = url.searchParams.get("action") || "archive";

      if (action === "create") {
        const formData = await req.formData();
        const valuesJson = formData.get("values") as string;
        const range = (formData.get("range") as string) || "Sheet1!A1";
        const file = formData.get("image") as File | null;

        let values = JSON.parse(valuesJson) as string[][];

        if (file) {
          const buffer = new Uint8Array(await file.arrayBuffer());
          const imageUrl = await uploadImageToDrive(
            file.name,
            file.type,
            buffer,
          );
          // Assuming Image_Link is the last column (index 10)
          if (values[0]) {
            values[0][10] = imageUrl;
          }
        }

        const result = await appendSheetRow(values, range);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided for archiving" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await getPrintDataAndArchive(buffer);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Google Integration POST Error:", error);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  /**
   * PUT /api/google?action=update
   */
  async PUT(req, _ctx) {
    try {
      const formData = await req.formData();
      const valuesJson = formData.get("values") as string;
      const range = formData.get("range") as string;
      const file = formData.get("image") as File | null;

      let values = JSON.parse(valuesJson) as string[][];

      if (file) {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const imageUrl = await uploadImageToDrive(file.name, file.type, buffer);
        if (values[0]) {
          values[0][10] = imageUrl;
        }
      }

      const result = await updateSheetRow(range, values);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  /**
   * DELETE /api/google?rowIndex=...
   */
  async DELETE(req, _ctx) {
    try {
      const url = new URL(req.url);
      const rowIndex = parseInt(url.searchParams.get("rowIndex") || "");
      if (isNaN(rowIndex)) {
        throw new Error("Invalid rowIndex for deletion");
      }
      const result = await deleteSheetRow(rowIndex);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
