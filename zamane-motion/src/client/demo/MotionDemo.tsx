// A playground for every animation in the kit, with example data.
// Not part of the app: delete it, or mount it on a dev-only route.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLagged } from '../lib/motion';
import { Button } from '../components/Button';
import { GoalCard } from '../components/GoalCard';
import { Progress } from '../components/Progress';
import { ShoppingItem } from '../components/ShoppingItem';
import { AnimatedList } from '../components/motion/AnimatedList';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { Sheet } from '../components/motion/Sheet';
import { GoalCardSkeleton } from '../components/motion/Skeleton';
import { TabBar } from '../components/motion/TabBar';
import { ToastViewport, toast } from '../components/motion/Toast';
import './demo.css';

const mad = (n: number) => `${Math.round(n).toLocaleString('en-US')} MAD`;
const SARA = { name: 'Sara', partner: 'a' as const };
const YOUSSEF = { name: 'Youssef', partner: 'b' as const };

type Item = { id: string; name: string; qty?: number; price?: number; by: typeof SARA | typeof YOUSSEF; bought: boolean; remote?: boolean };

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="demo-section">
      <h2>{title}</h2>
      <p className="demo-hint">{hint}</p>
      {children}
    </section>
  );
}

/** One shopping row that moves to Bought 650 ms after its tick, so the tick is seen. */
function useGrouped(items: Item[]) {
  const lagged = useLagged(
    items.map((i) => (i.bought ? i.id : '')).join(','),
    650,
  );
  const settled = new Set(lagged.split(',').filter(Boolean));
  return {
    toBuy: items.filter((i) => !settled.has(i.id)),
    bought: items.filter((i) => settled.has(i.id)),
  };
}

const EXTRA = [
  { name: 'Mint', by: YOUSSEF },
  { name: 'Saffron threads', price: 45, by: SARA },
  { name: 'Lemons', qty: 6, by: YOUSSEF },
  { name: 'Couscous', price: 18, by: SARA },
  { name: 'Argan oil', price: 120, by: YOUSSEF },
];

export function MotionDemo() {
  const [saved, setSaved] = useState(18500);
  const [btn, setBtn] = useState<'idle' | 'loading' | 'success'>('idle');
  const [budget, setBudget] = useState(6200);
  const [sheet, setSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replay, setReplay] = useState(0);
  const [tab, setTab] = useState<'home' | 'goals' | 'trips' | 'shopping' | 'profile'>('home');
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'Olive oil', qty: 2, price: 140, by: SARA, bought: false },
    { id: '2', name: 'Bread', by: YOUSSEF, bought: false },
    { id: '3', name: 'Milk', price: 9, by: YOUSSEF, bought: true },
  ]);
  const [next, setNext] = useState(0);
  const { toBuy, bought } = useGrouped(items);

  const save = () => {
    setBtn('loading');
    setTimeout(() => {
      setSaved((s) => Math.min(20000, s + 500));
      setBtn('success');
      setTimeout(() => setBtn('idle'), 1100);
    }, 900);
  };

  const add = (remote: boolean) => {
    const pick = EXTRA[next % EXTRA.length];
    const who = remote ? YOUSSEF : SARA;
    setNext((n) => n + 1);
    setItems((list) => [{ id: `n${Date.now()}`, ...pick, by: who, bought: false, remote }, ...list]);
    if (remote) toast(`${who.name} added ${pick.name}`, { who });
  };

  const homeCards = [
    <GoalCard key="w" title="Wedding fund" saved={saved} target={20000} formatAmount={mad} deadlineLabel="by Sat 12 Jun" lastBy={SARA} lastActivity="added 500 · just now" onOpen={() => toast('Opens the goal')} />,
    <GoalCard key="s" title="Learn Spanish" kind="general" percent={60} lastBy={YOUSSEF} lastActivity="updated · today" onOpen={() => toast('Opens the goal')} />,
    <GoalCard key="k" title="New sofa" saved={4200} target={6000} formatAmount={mad} lastBy={YOUSSEF} lastActivity="added 1,000 · Oct 30" onOpen={() => toast('Opens the goal')} />,
  ];

  return (
    <div className="demo">
      <header className="demo-head">
        <h1>Zamane motion</h1>
        <p>Every animation in the app's components, with example data. Tap things.</p>
      </header>

      <Section title="Buttons" hint="Press any button: it sinks to 98%. The primary one loads with a turning zellige star, then draws a check.">
        <div className="demo-row">
          <Button variant="primary" status={btn} onClick={save}>
            Add 500 MAD
          </Button>
          <Button onClick={() => toast('Scheduled for Tue 24 Nov')}>Schedule</Button>
          <Button variant="ghost">See history</Button>
          <Button variant="danger" size="sm">
            Delete entry
          </Button>
        </div>
      </Section>

      <Section title="Goal card" hint="Add 500 above or here: the amount counts up and the bar slides. At 20,000 the bar turns green, 'Done' pops in and stars burst.">
        {homeCards[0]}
        <div className="demo-row">
          <Button size="sm" onClick={() => setSaved((s) => Math.min(20000, s + 500))}>
            Add 500
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSaved(18500)}>
            Reset
          </Button>
        </div>
      </Section>

      <Section title="Numbers and bars" hint="Totals count to their new value; a trip budget turns red with words when the plan goes over.">
        <div className="demo-total">
          <span>Saved together</span>
          <b>
            <AnimatedNumber value={saved + 1750} format={mad} />
          </b>
        </div>
        <Progress label="Chefchaouen · planned vs budget" mode="budget" value={budget} max={8000} formatAmount={mad} />
        <div className="demo-row">
          <Button size="sm" onClick={() => setBudget((b) => b + 900)}>
            Book a riad (+900)
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBudget(6200)}>
            Reset
          </Button>
        </div>
      </Section>

      <Section title="Shopping list" hint="Tick a row: the box pops, the line draws through, then it slides down to Bought. 'Youssef adds' shows an item arriving from your partner.">
        <div className="demo-row">
          <Button size="sm" onClick={() => add(false)}>
            Add an item
          </Button>
          <Button size="sm" onClick={() => add(true)}>
            Youssef adds an item
          </Button>
        </div>
        <div className="demo-list">
          <AnimatedList items={toBuy} getKey={(i) => i.id} isRemote={(i) => !!i.remote}>
            {(i) => (
              <ShoppingItem
                name={i.name}
                quantity={i.qty}
                price={i.price}
                formatAmount={mad}
                addedBy={i.by}
                boughtBy={SARA}
                bought={i.bought}
                onToggle={(b) => setItems((list) => list.map((x) => (x.id === i.id ? { ...x, bought: b } : x)))}
              />
            )}
          </AnimatedList>
        </div>
        <h3 className="demo-group">Bought</h3>
        <div className="demo-list">
          <AnimatedList items={bought} getKey={(i) => i.id}>
            {(i) => (
              <ShoppingItem
                name={i.name}
                quantity={i.qty}
                price={i.price}
                formatAmount={mad}
                addedBy={i.by}
                boughtBy={SARA}
                bought={i.bought}
                onToggle={(b) => setItems((list) => list.map((x) => (x.id === i.id ? { ...x, bought: b } : x)))}
              />
            )}
          </AnimatedList>
        </div>
      </Section>

      <Section title="Cards arriving" hint="Lists of cards rise in one after another when a screen opens. Loading shows sand placeholders.">
        <div className="demo-row">
          <Button size="sm" onClick={() => setReplay((r) => r + 1)}>
            Replay
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                setReplay((r) => r + 1);
              }, 1600);
            }}
          >
            Load again
          </Button>
        </div>
        {loading ? (
          <div className="demo-stack">
            <GoalCardSkeleton />
            <GoalCardSkeleton />
            <GoalCardSkeleton />
          </div>
        ) : (
          <AnimatedList key={replay} appear items={homeCards} getKey={(c) => String(c.key)} className="demo-stack">
            {(c) => c}
          </AnimatedList>
        )}
      </Section>

      <Section title="Bottom sheet" hint="Springs up from the bottom. Drag the handle down, tap outside or press Escape to close.">
        <Button variant="primary" onClick={() => setSheet(true)}>
          Add to a goal
        </Button>
      </Section>

      <Section title="Tab bar" hint="The highlight slides to the tab you pick.">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'home', label: 'Home' },
            { id: 'goals', label: 'Goals' },
            { id: 'trips', label: 'Trips' },
            { id: 'shopping', label: 'Shopping' },
            { id: 'profile', label: 'Profile' },
          ]}
        />
      </Section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add to Wedding fund">
        <div className="demo-sheet">
          <label htmlFor="demo-amount">Amount</label>
          <input id="demo-amount" inputMode="decimal" defaultValue="500" />
          <label htmlFor="demo-note">Note</label>
          <input id="demo-note" placeholder="Bonus month" />
          <Button
            variant="primary"
            block
            onClick={() => {
              setSheet(false);
              setSaved((s) => Math.min(20000, s + 500));
              toast('Added 500 MAD to Wedding fund', { who: SARA });
            }}
          >
            Add contribution
          </Button>
        </div>
      </Sheet>
      <ToastViewport />
    </div>
  );
}
