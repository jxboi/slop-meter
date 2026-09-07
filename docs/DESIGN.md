# Slop Meter design system

Reference: design-concept.png, generated full-screen concept at 1536 × 1024.

White main canvas, #f7f8f5 sidebar, #53684a olive accent, #20231f text, #737870 secondary text, #e4e7df borders. Inter typography: 30px page heading, 17px section heading, 14px body and controls, 12px metadata. Eight-pixel corner radius; 4/8/12/16/24/32 spacing; thin Lucide outline icons at 18px with 1.7 stroke. No decorative imagery, gradients, or heavy shadows. The activity brand is a code-native vector icon.

A 240px sidebar and 36px main gutters frame a breadcrumb, headline/action row, a four-column metric strip, a 60/40 priority/insight region, then a full-width repository table. Main copy: “A little less slop. A lot more direction.”; “Your codebase, understood. Here’s where to make a difference.”; “What to fix first”; “Biggest impact. Right order.”; “Codebase health”; “The bigger picture”; “Fewer warnings. Clearer decisions.”; “Your repositories”. Primary actions: Add repository, Run scan, View roadmap, View all.

Secondary surfaces reuse the same navigation, typography, open tables, and bordered sections: repository detail, a right-side evidence drawer, roadmap grouped by readiness, scan history, profile editor, source library, settings. Modals use the same input/button geometry. On small screens the sidebar becomes a compact navigation sheet; metrics become two columns and content stacks. Respect reduced motion and visible focus.

Intentional data corrections to the generated concept: all aggregates derive from actual displayed records; sample data is labeled; confidence and source provenance are exposed. No invented team identity. The generated chart dates are replaced with dates from the stored scans. Additional workflow controls are required by the requested product.

## Final visual comparison

The concept and final browser captures were both inspected using `view_image`. Desktop was captured at the reference's native 1536 × 1024 viewport; mobile was checked at 390 × 844. In-app browser interactions verified the real workflows. The installed agent-browser verifier supplied reliable screenshots because the in-app browser's enlarged viewport captures clipped or duplicated content.

| Comparison | Reference and implementation | Resolution |
| --- | --- | --- |
| Canvas and palette | White content, pale neutral sidebar, restrained olive actions | Preserved; secondary text contrast strengthened |
| Navigation | Persistent sidebar, workspace selector, overview, repositories, roadmap, history, profiles, knowledge, settings | Preserved; personal workspace identity replaces the invented person |
| Typography and hierarchy | Strong introductory heading, concise subheading, clear section titles, quiet metadata | Preserved; controls and metadata use deliberate type sizes |
| Priority list | Three numbered decisions with impact, repository, reason, effort, and evidence counts | Preserved; wider priority column favors the primary product question |
| Chart and compression | Right-hand health trend and findings → patterns → root causes | Preserved; all plotted points and totals derive from workspace records |
| Repository table | Three rows beneath the analysis | Reduced excess vertical spacing so the table fits the 1024px desktop viewport |
| Copy | Core headline, primary actions, navigation, and section titles | Preserved; sample labels, accurate totals, source dates, and functional guide intentionally replace speculative concept content |
| Mobile | Same information hierarchy | Two-column metrics, stacked sections, collapsible navigation, and no document-level horizontal overflow |

The final interface was verified against the design direction, with the intentional data and workflow deviations recorded above. No unresolved material clipping or layout issues remain in the checked viewports.
