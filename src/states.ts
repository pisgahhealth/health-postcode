/** ISO 3166-2:NG codes; NIPOST has not published its own list, every code in its published examples matches this table, and it is a display hint rather than a fact of record. */
export const STATE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  AB: "Abia", AD: "Adamawa", AK: "Akwa Ibom", AN: "Anambra", BA: "Bauchi", BY: "Bayelsa",
  BE: "Benue", BO: "Borno", CR: "Cross River", DE: "Delta", EB: "Ebonyi", ED: "Edo",
  EK: "Ekiti", EN: "Enugu", FC: "FCT", GO: "Gombe", IM: "Imo", JI: "Jigawa",
  KD: "Kaduna", KN: "Kano", KT: "Katsina", KE: "Kebbi", KO: "Kogi", KW: "Kwara",
  LA: "Lagos", NA: "Nasarawa", NI: "Niger", OG: "Ogun", ON: "Ondo", OS: "Osun",
  OY: "Oyo", PL: "Plateau", RI: "Rivers", SO: "Sokoto", TA: "Taraba", YO: "Yobe", ZA: "Zamfara",
});

/** Codes confirmed in the 21 test postcodes NIPOST itself has published; extend as more appear. */
export const STATE_CODES_SEEN = ["AK", "BA", "EB", "EK", "EN", "FC", "JI", "KN", "LA", "NI", "OG"] as const;

/** Accepts a two-letter code, a partial or a full postcode in any style. */
export function stateName(_input: string): string | null {
  throw new Error("not implemented");
}
