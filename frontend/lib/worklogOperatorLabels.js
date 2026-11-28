const clean = value => typeof value === "string" ? value.trim() : "";
const comparable = value => clean(value).normalize("NFC").toLowerCase()
  .replace(/\s+/gu, " ").replace(/\( +| +\)/gu, edge => edge.trim());

function nameWithNickname(name, nickname) {
  const suffix = `(${nickname})`;
  if (!nickname || comparable(name) === comparable(nickname) || comparable(name).endsWith(comparable(suffix))) {
    return name;
  }
  return `${name} ${suffix}`;
}

function labelCounts(people) {
  const counts = new Map();
  for (const { label } of people) {
    const key = comparable(label);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function labelWorklogOperators(people) {
  const labeled = people.map(person => {
    const nickname = clean(person.nickname);
    const fullName = clean(person.fullName);
    const name = clean(person.displayName) || fullName || nickname || clean(person.email) || person.id;
    return { ...person, label: nameWithNickname(name, nickname) };
  });

  const originalCounts = labelCounts(labeled);
  const withFullNames = labeled.map(person => {
    const fullName = clean(person.fullName);
    if (!fullName || originalCounts.get(comparable(person.label)) === 1 ||
        comparable(nameWithNickname(fullName, clean(person.nickname))) === comparable(person.label)) {
      return person;
    }
    return { ...person, label: `${person.label} · ${fullName}` };
  });

  const finalCounts = labelCounts(withFullNames);
  return withFullNames.map(person => finalCounts.get(comparable(person.label)) === 1
    ? person
    : { ...person, label: `${person.label} · ${clean(person.email) || person.id}` });
}
