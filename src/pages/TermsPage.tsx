const banned = [
  {
    title: "Adult and sexual content",
    body: "Pornography, sexual services, escorting, fetish content, or anything sexually explicit. Anything involving minors is banned without exception.",
  },
  {
    title: "Illegal activity",
    body: "Crime, stolen goods, counterfeits, trafficking, or any listing that asks people to break the law.",
  },
  {
    title: "Drugs and controlled substances",
    body: "Illegal drugs, prescriptions sold without a license, intoxicants, and drug paraphernalia. gethigh is a dump board, not a drug brand.",
  },
  {
    title: "Weapons and explosives",
    body: "Firearms, ammunition, explosives, and anything built to injure people.",
  },
  {
    title: "Violence, hate, and extremism",
    body: "Threats, terrorism, hate speech, harassment, or content that attacks people for who they are.",
  },
  {
    title: "Scams and fraud",
    body: "Phishing, fake shops, pyramid schemes, impersonation, and anything meant to steal money or data.",
  },
  {
    title: "Malware and hacking",
    body: "Viruses, spyware, credential theft, or tools for unauthorized access.",
  },
  {
    title: "Gambling and exploitation",
    body: "Unlicensed gambling, human exploitation, and anything that preys on people.",
  },
];

const sections = [
  {
    title: "Using gethigh",
    body: "gethigh is a paid dump board. You bid to put a URL or handle on the leaderboard, dump someone else’s spot, take a sponsor seat, or claim a bike tank slot. By using the site you agree to these terms.",
  },
  {
    title: "Your listings",
    body: "You are responsible for every URL, handle, name, and image you put on the board. Only submit sites you have the right to promote. Do not impersonate others. If we ask you to change or remove a listing, do it.",
  },
  {
    title: "Payments",
    body: "Bids, dumps, and sponsor seats are charged in full when you check out. Payments go through Dodo. Fees are not refundable once a listing is live, except where the law requires it or we remove a listing for a terms violation on our side.",
  },
  {
    title: "Moderation",
    body: "We can refuse, hide, dump, or delete any listing that breaks these terms or looks like it might. We can also block checkout, ban accounts, and report illegal activity. We do not have to give a reason first.",
  },
  {
    title: "No endorsement",
    body: "A URL on the board is a paid listing, not an endorsement. gethigh does not verify, recommend, or stand behind the sites people dump onto the board.",
  },
  {
    title: "The board can change",
    body: "Ranks move. Prices decay. Today’s board wipes at midnight. Spots get dumped. We can change rules, prices, and features. If we update these terms, the new version lives on this page.",
  },
];

export function TermsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[756px] text-center">
      <p className="text-[13px] font-semibold tracking-[-0.2px] text-muted">
        Last updated September 2, 2026
      </p>
      <h1 className="mt-2 font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[72px]">
        Terms &amp; conditions
      </h1>
      <p className="mx-auto mt-4 max-w-[540px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        We do not promote adult content, illegal activity, drugs, or anything
        else that harms people. If that is your site, it does not belong on
        gethigh.
      </p>

      <section className="mt-10 text-left">
        <div className="card border border-fire/25 bg-orange-soft px-6 py-6 sm:px-8">
          <p className="text-[15px] font-bold text-fire-deep">What we don’t promote</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.6px] text-fg-strong sm:text-[26px]">
            Keep it off the board
          </h2>
          <p className="mt-1 text-[15px] leading-[1.4] font-medium tracking-[-0.32px] text-muted">
            gethigh does not host, sell, recommend, or allow listings for the
            categories below. Submitting them can get the listing removed and
            the payment kept.
          </p>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {banned.map((item) => (
            <li key={item.title} className="card px-5 py-5 text-left">
              <h3 className="text-[16px] font-semibold tracking-[-0.4px] text-fg-strong">
                {item.title}
              </h3>
              <p className="mt-1 text-[14px] leading-[1.4] font-medium tracking-[-0.28px] text-muted">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <ol className="mt-8 space-y-4 text-left">
        {sections.map((section, index) => (
          <li key={section.title} className="card px-6 py-6 sm:px-8">
            <div className="text-[15px] font-bold text-accent">
              #{index + 1}
            </div>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.6px] text-fg-strong sm:text-[26px]">
              {section.title}
            </h2>
            <p className="mt-1 text-[15px] leading-[1.4] font-medium tracking-[-0.32px] text-muted">
              {section.body}
            </p>
          </li>
        ))}
      </ol>

      <p className="mx-auto mt-8 max-w-[500px] text-[14px] leading-[1.45] font-medium tracking-[-0.28px] text-muted">
        Questions about a listing or these terms: use the site as intended, and
        do not submit anything from the banned list above.
      </p>
    </div>
  );
}
