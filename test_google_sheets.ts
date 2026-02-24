import "https://deno.land/std@0.215.0/dotenv/load.ts";
import { fetchSheetData } from "./common/google_integration.ts";

try {
  console.log("Fetching sheet data...");
  const data = await fetchSheetData("A1:B5");
  console.log("Data fetched successfully:");
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error("Error fetching sheet data:");
  console.error(error);
}
