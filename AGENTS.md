<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- No auth by design (single-business app); never add login/accounts.
- Data persists in browser localStorage via `src/lib/store.ts` (single DB object, all mutations go through its action functions so activity is logged); a JSON backup/restore lives in Settings. Why: no backend was chosen; move to Lovable Cloud if multi-device sync is needed.
- All money math uses integer cents and weight uses integer milli-pounds in `src/lib/calc.ts`; never sum floats. Rules are covered by `src/test/calc.test.ts`.
- Invoice numbers are allocated only in `createInvoice` (skips any number already used) and are never edited after creation.
- `InvoiceDocument` is the single invoice layout for preview, print and PDF (html2canvas-pro + jsPDF); it renders only the package lines that exist.
