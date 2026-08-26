# Security policy and asset-input threat model

Character Creator treats recipes and asset manifests as untrusted data. Parsing rejects prototype-pollution keys, oversized recipe input, unknown closed-schema properties, unsafe paths, traversal, absolute paths, executable URLs, invalid hashes, and incompatible versions before rendering. Asset packs are data-only and cannot supply JavaScript.

Hosts should serve assets from an explicit allowlisted base URL, enforce response-size and image-dimension budgets, use a restrictive Content Security Policy, and retain the last valid recipe after any import or render error. Do not concatenate manifest fields into HTML; Studio-facing names must be escaped before interpolation in a production host.

The 0.1 browser schema parser uses Ajv runtime compilation. Strict-CSP hosts should precompile validators during their build; otherwise scope `'unsafe-eval'` to the smallest trusted application origin and keep all asset/manifests data-only. This limitation is disclosed in the integration guide and release checklist.

Report suspected vulnerabilities privately to the repository owner through GitHub Security Advisories. Include the affected version, minimal reproduction, and impact. Do not include private recipes or copyrighted asset files unless necessary.
