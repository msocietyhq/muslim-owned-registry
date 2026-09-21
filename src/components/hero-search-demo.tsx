"use client";

import { useEffect, useState } from "react";
import { BookmarkIcon } from "@/components/bookmark-icon";

const QUERY = "kenduri lunch for twelve in Jurong West";
const TYPE_MS = 40;
const IDLE = 450;
const TYPE_HOLD = 450;
const SEARCH = 1500;
const CARD_GAP = 520;
const LIST_HOLD = 520;
const CLICK_WINDUP = 360;
const CLICK_HOLD = 480;
const DOCK_HOLD = 2800;

const RESULTS = [
  {
    tag: "Catering",
    brand: "Saffron Kenduri Kitchen",
    summary: "Trays and buffet packs from Jurong West.",
  },
  {
    tag: "Venue",
    brand: "Punggol Family Hall",
    summary: "A hall for family gatherings.",
  },
  {
    tag: "Bakery",
    brand: "Bishan Party Cake",
    summary: "Cakes for twelve to forty slices.",
  },
] as const;

const BOOKMARK_ORDER = [0, 2] as const;

const TYPE_END = IDLE + QUERY.length * TYPE_MS;
const SEARCH_START = TYPE_END + TYPE_HOLD;
const SEARCH_END = SEARCH_START + SEARCH;
const CARDS_END = SEARCH_END + RESULTS.length * CARD_GAP;
const BOOKMARK_START = CARDS_END + LIST_HOLD;
const BOOKMARK_STEP = CLICK_WINDUP + CLICK_HOLD;
const DOCK_START = BOOKMARK_START + BOOKMARK_ORDER.length * BOOKMARK_STEP;
const CYCLE = DOCK_START + DOCK_HOLD;

type Frame = {
  typed: string;
  searching: boolean;
  shown: number;
  booked: number[];
  dock: boolean;
  clicking: number | null;
};

function frameAt(ms: number): Frame {
  if (ms < IDLE) {
    return { typed: "", searching: false, shown: 0, booked: [], dock: false, clicking: null };
  }
  if (ms < TYPE_END) {
    const count = Math.min(QUERY.length, Math.floor((ms - IDLE) / TYPE_MS) + 1);
    return {
      typed: QUERY.slice(0, count),
      searching: false,
      shown: 0,
      booked: [],
      dock: false,
      clicking: null,
    };
  }
  if (ms < SEARCH_START) {
    return { typed: QUERY, searching: false, shown: 0, booked: [], dock: false, clicking: null };
  }
  if (ms < SEARCH_END) {
    return { typed: QUERY, searching: true, shown: 0, booked: [], dock: false, clicking: null };
  }
  if (ms < CARDS_END) {
    const shown = Math.min(RESULTS.length, Math.floor((ms - SEARCH_END) / CARD_GAP) + 1);
    return { typed: QUERY, searching: false, shown, booked: [], dock: false, clicking: null };
  }
  if (ms < BOOKMARK_START) {
    return {
      typed: QUERY,
      searching: false,
      shown: RESULTS.length,
      booked: [],
      dock: false,
      clicking: null,
    };
  }
  if (ms < DOCK_START) {
    const step = Math.floor((ms - BOOKMARK_START) / BOOKMARK_STEP);
    const local = (ms - BOOKMARK_START) % BOOKMARK_STEP;
    const booked = BOOKMARK_ORDER.slice(0, local >= CLICK_WINDUP ? step + 1 : step);
    return {
      typed: QUERY,
      searching: false,
      shown: RESULTS.length,
      booked: [...booked],
      dock: false,
      clicking: local < CLICK_WINDUP ? BOOKMARK_ORDER[step] : null,
    };
  }
  return {
    typed: QUERY,
    searching: false,
    shown: RESULTS.length,
    booked: [...BOOKMARK_ORDER],
    dock: true,
    clicking: null,
  };
}

export function HeroSearchDemo() {
  const [frame, setFrame] = useState<Frame>(() => frameAt(0));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFrame(frameAt(CYCLE - 1));
      return;
    }

    const started = Date.now();
    const id = window.setInterval(() => {
      setFrame(frameAt((Date.now() - started) % CYCLE));
    }, 50);
    setFrame(frameAt(0));
    return () => window.clearInterval(id);
  }, []);

  const { typed, searching, shown, booked, dock, clicking } = frame;

  return (
    <div className="mosg-desk mosg-hero-demo" aria-hidden="true">
      <div className="mosg-desk-chrome">
        <i />
        <i />
        <i />
        <span>muslimowned.sg</span>
      </div>
      <div className="mosg-hero-demo-body">
        <p className="mosg-hero-demo-wordmark">muslimowned.sg</p>
        <div className="mosg-hero-demo-search">
          <span>
            {typed}
            {!searching && shown === 0 ? <b className="mosg-hero-demo-caret" /> : null}
          </span>
          <em>{searching ? "Finding…" : "Search"}</em>
        </div>
        <p className="mosg-hero-demo-status">
          {searching ? (
            <>
              <span className="mosg-hero-demo-dots">
                <i />
                <i />
                <i />
              </span>
              Matching catering, a hall, and a cake
            </>
          ) : shown ? (
            "Three listings that work together"
          ) : (
            "\u00a0"
          )}
        </p>
        <div className="mosg-hero-demo-list">
          {searching
            ? RESULTS.map((item) => <div key={item.brand} className="mosg-hero-demo-skel" />)
            : RESULTS.slice(0, shown).map((item, index) => {
                const saved = booked.includes(index);
                return (
                  <article
                    key={item.brand}
                    className={`mosg-shot-card mosg-hero-demo-card${clicking === index ? " is-clicking" : ""}`}
                  >
                    <p className="mosg-shot-kicker">{item.tag}</p>
                    <p className="mosg-shot-brand">{item.brand}</p>
                    <p className="mosg-shot-sum">{item.summary}</p>
                    <span className={`mosg-hero-demo-mark${saved ? " is-on" : ""}`}>
                      <BookmarkIcon filled={saved} className="h-3.5 w-3.5" />
                    </span>
                    {clicking === index ? (
                      <svg className="mosg-hero-demo-pointer" viewBox="0 0 14 18" aria-hidden>
                        <path
                          d="M1.2 1.1 12.4 9.4 7.1 10.6 9.8 16.8 7.2 17.9 4.4 11.5 1.2 14.6z"
                          fill="#122821"
                          stroke="#fffdf8"
                          strokeWidth="0.7"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </article>
                );
              })}
        </div>
        {dock ? (
          <div className="mosg-hero-demo-dock">
            <BookmarkIcon filled className="h-3 w-3" />
            View bookmarked
          </div>
        ) : null}
      </div>
    </div>
  );
}
