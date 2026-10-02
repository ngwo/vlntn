# Media profile

1. Edit `config.json`:
   - `letterboxd`: your username
   - `goodreadsUserId`: the number in your profile URL (goodreads.com/user/show/**12345678**-name). Your shelves must be public.
   - `backloggd`: your username
2. Create a GitHub repo and upload everything in this folder (including the hidden `.github` folder).
3. Repo Settings > Pages > Deploy from branch > `main` / root.
4. Actions tab > "Update profile data" > Run workflow. Refresh your Pages URL after a minute.

It then updates itself daily.

If the Backloggd scrape breaks, list games by hand in `games-manual.json`:
`[{"title":"Hades","image":"https://...jpg","url":"https://www.backloggd.com/games/hades/"}]`
