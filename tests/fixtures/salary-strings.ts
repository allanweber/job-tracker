import type { StructuredSalary } from "@/server/scraping/salary/parse-salary";

export const SALARY_CASES: { input: string; expected: StructuredSalary }[] = [
  {
    input: "$120,000 - $150,000 a year",
    expected: { min: 120000, max: 150000, currency: "USD", period: "year" },
  },
  {
    input: "£45k–£55k per annum",
    expected: { min: 45000, max: 55000, currency: "GBP", period: "year" },
  },
  {
    input: "$40/hr",
    expected: { min: 40, max: 40, currency: "USD", period: "hour" },
  },
  {
    input: "USD 90,000/yr",
    expected: { min: 90000, max: 90000, currency: "USD", period: "year" },
  },
  {
    input: "40,000-50,000 EUR",
    expected: { min: 40000, max: 50000, currency: "EUR", period: undefined },
  },
  {
    input: "R$ 8.000,00 a R$ 10.000,00 por ano",
    expected: { min: 8000, max: 10000, currency: "BRL", period: "year" },
  },
  {
    input: "R$ 8.000 a R$ 10.000",
    expected: { min: 8000, max: 10000, currency: "BRL", period: undefined },
  },
  {
    input: "R$ 50,00 por hora",
    expected: { min: 50, max: 50, currency: "BRL", period: "hour" },
  },
  {
    input: "",
    expected: {},
  },
];
