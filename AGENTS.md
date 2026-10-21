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
- Accounts use Lovable Cloud email/password; AppShell gates the whole app on the session (no route-level gate). Why: user wants data tied to their account.
- All app data is one DB object in `src/lib/store.ts` (mutations via its action functions so activity is logged), cached in localStorage and synced per user as JSON to the `app_data` table by `src/lib/cloud.ts`; on sign-in cloud and device data are merged by id so no invoice is lost. Why: multi-device access with minimal rewrite.
- All money math uses integer cents and weight uses integer milli-pounds in `src/lib/calc.ts`; never sum floats. Rules are covered by `src/test/calc.test.ts`.
- Invoice numbers are allocated only in `createInvoice` (skips any number already used) and are never edited after creation.
- `InvoiceDocument` is the single invoice layout for preview, print and PDF (html2canvas-pro + jsPDF); it renders only the package lines that exist.
- POS receipts print from a separate frame (`src/lib/receipt.ts`) so the page size matches the chosen printer (thermal 58/80mm or A4) instead of the global A4 print style. Sales are stored in the same DB object and decrement stock in `recordSale`.
