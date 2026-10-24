def fix():
    with open("src/lib/careerApi.ts", "r", encoding="utf-8") as f:
        lines = f.readlines()

    idx = -1
    for i, line in enumerate(lines):
        if "export async function batchParseJobDescriptions" in line:
            idx = i
            break

    if idx != -1:
        lines = lines[:idx]

    b = "`"
    s = "$"
    code = f"""export async function batchParseJobDescriptions(items: Array<{{
  item_id?: string;
  input_type: "text" | "url";
  url?: string;
  raw_text?: string;
  job_title?: string;
  company_name?: string;
  seniority?: string;
}}>): Promise<{{
  total_requested: number;
  successful_count: number;
  failed_count: number;
  results: Array<{{
    item_id: string;
    status: "success" | "error";
    data?: any;
    error?: string;
  }}>;
}}> {{
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch({b}{s}{{API_BASE}}/career/parse-jd/batch{b}, {{
    method: "POST",
    headers: {{
      "Content-Type": "application/json",
      ...authHeaders,
    }},
    body: JSON.stringify({{ items }}),
  }});
  if (!res.ok) {{
    const err = await res.json().catch(() => ({{}}));
    throw new Error(err.detail || {b}Batch parse failed: {s}{{res.status}}{b});
  }}
  return res.json();
}}
"""
    with open("src/lib/careerApi.ts", "w", encoding="utf-8") as f:
        f.writelines(lines)
        f.write(code)
    print("Fixed batchParseJobDescriptions in careerApi.ts")

if __name__ == "__main__":
    fix()
