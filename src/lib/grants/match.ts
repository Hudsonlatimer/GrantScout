import { PROGRAMS, type FundingType, type Program, type Region } from "./data";

export type SearchInput = {
  region?: Region;
  fundingType?: FundingType | "any";
  industry?: string;
};

const norm = (s: string) => s.toLowerCase().trim();

const regionMatches = (program: Program, region?: Region): boolean => {
  if (!region) return true;
  const programRegions = Array.isArray(program.region) ? program.region : [program.region];
  // Federal programs are always available; otherwise the program's regions must include the user's.
  if (programRegions.includes("federal")) return true;
  return programRegions.includes(region);
};

const industryMatches = (program: Program, industry?: string): boolean => {
  if (!industry) return true;
  if (program.industries === "all") return true;
  const q = norm(industry);
  return program.industries.some((i) => {
    const ni = norm(i);
    return ni === q || ni.includes(q) || q.includes(ni);
  });
};

const typeMatches = (program: Program, type?: FundingType | "any"): boolean => {
  if (!type || type === "any") return true;
  return program.type.includes(type);
};

// Generous search: try the strict filter first, then progressively relax so
// the model always gets a useful list back. Final fallback returns federal +
// region-matching programs regardless of industry/type.
export function searchGrants(input: SearchInput): Program[] {
  const { region, fundingType, industry } = input;

  const strict = PROGRAMS.filter(
    (p) =>
      regionMatches(p, region) &&
      typeMatches(p, fundingType) &&
      industryMatches(p, industry),
  );
  if (strict.length > 0) return strict;

  // Drop industry constraint
  const noIndustry = PROGRAMS.filter(
    (p) => regionMatches(p, region) && typeMatches(p, fundingType),
  );
  if (noIndustry.length > 0) return noIndustry;

  // Drop type constraint
  const regionOnly = PROGRAMS.filter((p) => regionMatches(p, region));
  if (regionOnly.length > 0) return regionOnly;

  // Last resort — return everything
  return PROGRAMS;
}

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}
