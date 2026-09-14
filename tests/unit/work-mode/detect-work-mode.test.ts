import { describe, expect, it } from "vitest";
import { detectWorkMode } from "@/server/scraping/work-mode";

describe("detectWorkMode", () => {
  it("detects remote from common phrasings", () => {
    expect(detectWorkMode("This is a fully remote position")).toBe("remote");
    expect(detectWorkMode("Work from home, US-based")).toBe("remote");
    expect(detectWorkMode("WFH role, flexible hours")).toBe("remote");
    expect(detectWorkMode("Open to telecommuting")).toBe("remote");
    expect(detectWorkMode("Remote-first company")).toBe("remote");
  });

  it("detects hybrid from common phrasings", () => {
    expect(detectWorkMode("San Francisco, CA (Hybrid)")).toBe("hybrid");
    expect(detectWorkMode("3 days onsite, 2 days remote — a hybrid arrangement")).toBe("hybrid");
  });

  it("prefers hybrid over remote when both are mentioned", () => {
    expect(detectWorkMode("Hybrid — remote-friendly, 2 days onsite")).toBe("hybrid");
  });

  it("detects onsite from common phrasings", () => {
    expect(detectWorkMode("This role is on-site in our Austin office")).toBe("onsite");
    expect(detectWorkMode("In-person collaboration required")).toBe("onsite");
  });

  it("returns undefined when nothing indicates a work mode", () => {
    expect(detectWorkMode("Senior Backend Engineer at Acme Corp")).toBeUndefined();
    expect(detectWorkMode(undefined, null, "")).toBeUndefined();
  });

  it("scans multiple fragments and skips empty ones", () => {
    expect(detectWorkMode(undefined, "", "Austin, TX", "Hybrid schedule")).toBe("hybrid");
  });

  it("detects pt-BR terms", () => {
    expect(detectWorkMode("Vaga 100% remota")).toBe("remote");
    expect(detectWorkMode("100% Remoto")).toBe("remote");
    expect(detectWorkMode("Regime home office")).toBe("remote");
    expect(detectWorkMode("Modalidade: híbrido")).toBe("hybrid");
    expect(detectWorkMode("Modalidade: hibrido")).toBe("hybrid"); // missing accent
    expect(detectWorkMode("Trabalho presencial em São Paulo")).toBe("onsite");
  });
});
