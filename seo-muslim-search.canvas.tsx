const volumeFood = [
  ["halal restaurant singapore", 14800, "LOW", 26, 0.25],
  ["halal food singapore", 8100, "LOW", 19, 0.39],
  ["halal catering singapore", 2400, "HIGH", 78, 2.3],
  ["halal bakery singapore", 2400, "HIGH", 80, 0.88],
  ["qurban singapore", 480, "LOW", 13, 2.56],
  ["aqiqah singapore", 320, "MEDIUM", 40, 1.55],
  ["muslim restaurant singapore", 110, "MEDIUM", 36, 0.33],
  ["muslim catering singapore", 50, "HIGH", 79, 0.56],
  ["muslim bakery singapore", 20, "MEDIUM", 49, 0.39],
] as const;

const volumeNonFood = [
  ["zakat singapore", 2900, "LOW", 27, 2.4, "finance / institutions"],
  ["muslim lawyer", 1600, "LOW", 7, 16.76, "legal"],
  ["madrasah singapore", 320, "LOW", 13, 1.34, "education"],
  ["islamic banking singapore", 260, "LOW", 30, 3.28, "finance"],
  ["wakaf singapore", 210, "MEDIUM", 47, 6.03, "institutions"],
  ["muslim lawyer singapore", 170, "HIGH", 69, 11.79, "legal"],
  ["syariah lawyer singapore", 170, "MEDIUM", 40, 14.36, "legal"],
  ["muslimah fashion singapore", 170, "HIGH", 100, 0.68, "retail"],
  ["muslim preschool singapore", 140, "HIGH", 70, 2.34, "education"],
  ["muslim childcare singapore", 110, "MEDIUM", 66, 2.13, "education"],
  ["islamic finance singapore", 90, "LOW", 21, 2.26, "finance"],
  ["islamic bookstore singapore", 90, "HIGH", 74, 0.06, "retail"],
  ["tudung singapore", 90, "HIGH", 91, 0.45, "retail"],
  ["hijab shop singapore", 50, "HIGH", 91, 0.42, "retail"],
  ["quran class singapore", 30, "MEDIUM", 45, 1.97, "education"],
  ["quran teacher singapore", 20, "MEDIUM", 60, 2.7, "education"],
  ["muslim insurance singapore", 10, "LOW", 27, null, "finance"],
  ["muslim wedding planner singapore", 10, "MEDIUM", 45, 2.09, "events"],
  ["pelamin singapore", 10, "HIGH", 93, 1.59, "events"],
] as const;

const related = [
  ["islamic finance singapore", "halal investment singapore", 210],
  ["islamic finance singapore", "ocbc islamic banking singapore", 50],
  ["quran class singapore", "ngaji class for adults singapore", 110],
  ["muslim lawyer singapore", "list of syariah lawyers in singapore", 50],
  ["muslim lawyer singapore", "best syariah lawyer in singapore", 50],
  ["muslim lawyer singapore", "malay lawyer singapore", 40],
  ["muslim lawyer singapore", "muslim lawyer for will", 30],
] as const;

const unmeasured = [
  "muslim software / IT / developer / web design / digital / marketing / app",
  "muslim accountant / doctor / dentist / clinic / GP / financial advisor",
  "muslim plumber / electrician / contractor / renovation / aircon / mover / locksmith",
  "muslim photographer / wedding photographer / emcee",
  "muslim owned software / muslim owned IT",
  "malay contractor / plumber / accountant",
  "bumiputera company singapore",
  "muslim tuition / islamic school / islamic goods / cleaning / transport",
];

const competitorHits = [
  ["bored taco / bored tacos", 49500, 8, "listing page"],
  ["the populus", 22200, 9, "listing page"],
  ["loong dim sum", 18100, 13, "listing page"],
  ["jing hotpot / jing", 5400, 10, "listing page"],
  ["jing halal chinese hotpot & grill buffet", 2900, 5, "listing page"],
  ["whiskdom chinatown", 1900, 7, "listing page"],
];

const serps = [
  {
    query: "muslim owned singapore",
    volume: "70 for “muslim owned”; exact phrase unmeasured",
    who: "muslimownedsg.com #1, Instagram, smo.sg, Humble Halal, p2e.com.sg",
  },
  {
    query: "muslim lawyer singapore",
    volume: "170 / month (muslim lawyer without SG: 1,600)",
    who: "ARLC, IRB Law, Singapore Legal Advice, PKWA, muslimlawyersg.com — firms and listicles, no directory",
  },
  {
    query: "islamic finance singapore",
    volume: "90 / month (+ halal investment 210)",
    who: "islamicfinance.sg, Instagram, NUS Law, Dentons — education/banks, not a business register",
  },
  {
    query: "quran class singapore",
    volume: "30 / month (ngaji class for adults: 110)",
    who: "Andalus, Darul Arqam, quranreading.sg, quranclass.sg — operators",
  },
  {
    query: "muslim software company singapore",
    volume: "unmeasured",
    who: "ISGN Ventures, Muslim Pro / Bitsmedia, Impact Connect (muslim tech startups), Karyawan — operators and articles, not a directory",
  },
  {
    query: "muslim photographer singapore",
    volume: "unmeasured",
    who: "Colossal Weddings, Natasha Kasim, Studio Five, Walimatul — wedding studios",
  },
  {
    query: "muslim plumber singapore",
    volume: "unmeasured",
    who: "Generic plumbers (Mr Plumber, Wong, 24hrs). Google treats this as “plumber”, not Muslim-owned",
  },
  {
    query: "muslim contractor singapore",
    volume: "unmeasured",
    who: "Casket/marble contractors + TikTok “Muslim-owned contractors”. Weak match for renovation",
  },
  {
    query: "muslim catering singapore",
    volume: "50 / month vs 2,400 for “halal catering”",
    who: "Elsie's Kitchen, Orange Clove, Chili Manis — operators, not directories",
  },
];

function money(n: number | null) {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

export default function MosgSeoCanvas() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 font-sans text-[15px] leading-relaxed text-zinc-900">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
          DataForSEO · Google Ads + Labs + SERP · Singapore (location 2702) · 21 Sep 2026
        </p>
        <h1 className="font-serif text-3xl text-emerald-950">
          Muslim-owned search in Singapore is not only food
        </h1>
        <p>
          Food still has the biggest search market, but the phrases people type for
          other categories are different. Legal, zakat, banking, preschool, and modest
          fashion have <strong>measured</strong> volume. Software, trades, clinics, and
          accountants as “muslim + trade” queries sit below Google Ads’ reporting
          floor — yet the SERPs still exist, and they are operators, not directories.
          muslimowned.sg ranks for <strong>0</strong> of these today.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="muslimowned.sg ranked keywords (SG)" value="0" />
        <Stat label="muslimownedsg.com ranked keywords (SG)" value="146" />
        <Stat label="Largest non-food “muslim …” query" value="lawyer 1.6k" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Non-food categories with measured demand</h2>
        <p>
          These are the Singapore English queries that cleared Google Ads volume.
          Software / IT / plumber / photographer / accountant did <em>not</em> — they
          are listed in the unmeasured block below. “Muslim lawyer” is the commercial
          prize: high CPC (~$17) and firms already bidding/ranking.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-emerald-950 text-amber-100">
              <tr>
                <th className="px-3 py-2 font-medium">Keyword</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Monthly volume</th>
                <th className="px-3 py-2 font-medium">Ads competition</th>
                <th className="px-3 py-2 font-medium">CPC</th>
              </tr>
            </thead>
            <tbody>
              {volumeNonFood.map((row) => (
                <tr key={row[0]} className="odd:bg-zinc-50">
                  <td className="px-3 py-1.5">{row[0]}</td>
                  <td className="px-3 py-1.5 text-zinc-600">{row[5]}</td>
                  <td className="px-3 py-1.5 tabular-nums">{row[1].toLocaleString()}</td>
                  <td className="px-3 py-1.5">
                    {row[2]} ({row[3]})
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{money(row[4])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Related queries Google already clusters</h2>
        <p>
          Keyword ideas for software/trades seeds returned empty after a volume filter.
          Related keywords did fire for finance, Quran classes, and lawyers.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-emerald-950 text-amber-100">
              <tr>
                <th className="px-3 py-2 font-medium">Seed</th>
                <th className="px-3 py-2 font-medium">Related</th>
                <th className="px-3 py-2 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody>
              {related.map((row) => (
                <tr key={`${row[0]}-${row[1]}`} className="odd:bg-zinc-50">
                  <td className="px-3 py-1.5">{row[0]}</td>
                  <td className="px-3 py-1.5">{row[1]}</td>
                  <td className="px-3 py-1.5 tabular-nums">{row[2].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Unmeasured: software, trades, clinics</h2>
        <p>
          Google Ads returned <code>null</code> volume for these. That is below the
          reporting floor, not “nobody searches”. Live SERPs still return results —
          usually the businesses themselves, generic trades, or one-off articles
          (Impact Connect for Muslim tech startups). A directory can still rank here
          because there is almost no competing register.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {unmeasured.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Who owns the SERPs today</h2>
        <p>
          Live Google organic (desktop, Singapore). muslimowned.sg is in none of these
          top results. Directory competitors (muslimownedsg.com, smo.sg) also barely
          show outside food / “muslim owned”.
        </p>
        <ul className="grid gap-3">
          {serps.map((row) => (
            <li key={row.query} className="rounded-xl border border-zinc-200 p-4">
              <p className="font-semibold">{row.query}</p>
              <p className="text-sm text-zinc-600">{row.volume}</p>
              <p className="mt-1 text-sm">{row.who}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Food is still the largest pool</h2>
        <p>
          Searchers use <strong>halal</strong> far more than <strong>muslim</strong>{" "}
          for F&amp;B. That does not change. It is just not the only category.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-emerald-950 text-amber-100">
              <tr>
                <th className="px-3 py-2 font-medium">Keyword (SG, English)</th>
                <th className="px-3 py-2 font-medium">Monthly volume</th>
                <th className="px-3 py-2 font-medium">Ads competition</th>
                <th className="px-3 py-2 font-medium">CPC</th>
              </tr>
            </thead>
            <tbody>
              {volumeFood.map((row) => (
                <tr key={row[0]} className="odd:bg-zinc-50">
                  <td className="px-3 py-1.5">{row[0]}</td>
                  <td className="px-3 py-1.5 tabular-nums">{row[1].toLocaleString()}</td>
                  <td className="px-3 py-1.5">
                    {row[2]} ({row[3]})
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">{money(row[4])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Competitor proof: listing-brand pages</h2>
        <p>
          muslimownedsg.com’s 146 Singapore rankings are still mostly{" "}
          <strong>individual restaurant names</strong>. That model applies to lawyers,
          studios, and software firms too: rank for the business name first, then the
          category page.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-emerald-950 text-amber-100">
              <tr>
                <th className="px-3 py-2 font-medium">Query they rank for</th>
                <th className="px-3 py-2 font-medium">Volume</th>
                <th className="px-3 py-2 font-medium">Rank</th>
                <th className="px-3 py-2 font-medium">URL type</th>
              </tr>
            </thead>
            <tbody>
              {competitorHits.map((row) => (
                <tr key={row[0]} className="odd:bg-zinc-50">
                  <td className="px-3 py-1.5">{row[0]}</td>
                  <td className="px-3 py-1.5 tabular-nums">{row[1].toLocaleString()}</td>
                  <td className="px-3 py-1.5 tabular-nums">{row[2]}</td>
                  <td className="px-3 py-1.5">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What this means</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Recruit beyond F&amp;B.</strong> Lawyers, preschool/childcare, modest
            fashion, Islamic bookstores, Quran teachers, and wedding vendors have
            measurable “muslim …” intent. Software and trades will not show in Ads
            dashboards but still have a SERP with no register occupying it.
          </li>
          <li>
            <strong>Build category URLs where volume exists:</strong> lawyers / syariah,
            zakat (if listings are MUIS-adjacent or advisors), islamic banking / finance
            advisors, preschool &amp; childcare, muslimah fashion / tudung / hijab,
            quran class. Do not invent a “muslim software companies” hub until there
            are enough live listings — the query itself is unmeasured.
          </li>
          <li>
            <strong>Software is supply-led, not demand-led.</strong> People do not type
            “muslim software company singapore” in volume. They type firm names (Muslim
            Pro, ISGN). List those companies so listing pages can rank for the names.
          </li>
          <li>
            <strong>Trades (plumber, electrician, contractor)</strong> Google currently
            rewrites toward generic “plumber singapore”. A directory only wins if
            listings have unique names, areas, WhatsApp, and reviews so Google can
            match “muslim plumber tampines” later.
          </li>
          <li>
            <strong>Legal is the high-CPC exception.</strong> Firms already own
            “muslim lawyer”. A directory page (“list of syariah lawyers”) has 50 / month
            — small, but that is exactly a register query. Worth a dedicated category
            once you have several live law listings.
          </li>
          <li>
            <strong>Food + listing-brand search remains the traffic engine.</strong>{" "}
            Halal restaurant/food (14.8k / 8.1k) and competitor restaurant-name
            rankings are still where scale lives. Non-food is differentiation and
            coverage, not a replacement for F&amp;B listings.
          </li>
        </ol>
      </section>

      <p className="text-xs text-zinc-500">
        Source: DataForSEO Google Ads search volume live, Labs keyword_ideas /
        related_keywords, SERP organic live/regular. Singapore, English. Non-food
        pull ~$0.18; food pull earlier the same day under $0.20. Keyword ideas for
        software/trades seeds returned no extra rows after the volume filter. “muslim
        accountant singapore” SERP looked like Islamic-finance substitution (Labs
        noise) — treat with caution.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-900/15 bg-emerald-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{label}</p>
      <p className="mt-1 font-serif text-3xl text-emerald-950">{value}</p>
    </div>
  );
}
