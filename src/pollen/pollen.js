(() => {
  const argsL = args.toLowerCase();

  if (!argsL) {
    return "Format for pollen tag is `-t pollen <species> <country> [[-]NUMh]`";
  }

  const species = (argsL.match(/(alder|birch|grass|mugwort|olive|ragw)/g) ?? [])[0];
  if (!species) {
    return "Please provide pollen to look for `-t pollen <alder|birch|grass|mugwort|olive|ragw>`";
  }

  const countries = {
    lv: ['lv', 'latvia', 'latvija'],
    dk: ['dk', 'denmark', 'danmark'],
    pl: ['pl', 'poland', 'polska']
  };
  const country = (new RegExp(
    `(${Object.entries(countries)
      .map(([country, strings]) => `(?<${country}>)(${strings.join('|')})`)
      .join('|')})`, "g"
  ).exec(argsL).groups ?? [])[0];

  if (!country) {
    return `Please provide country to look for \`-t pollen <${Object.values(countries).flat().join('|')}>\``;
  }

  const map = {
    latvia: { map: 'ne', x: 700, y: 750, },
    denmark: { map: 'nw', x: 1225, y: 325, },
    poland: { map: 'central', x: 1050, y: 350 }
  }[country];


  const hourOffset = parseInt((argsL.match(/-?\d+(?=h)/) ?? ["0"])[0]);
  const formatTime = T => T.toISOString().replace(".000", "");
  const msinhour = 1000 * 60 * 60;
  const msinday = msinhour * 24;
  const currentT = new Date;
  const validT = new Date(Math.round(currentT / msinhour + hourOffset) * msinhour);
  const validBase = new Date(Math.floor(validT / msinday) * msinday);
  const dayOffset = -1 + Math.floor(currentT.getUTCHours() / 10);
  const newestBase = new Date(Math.floor(currentT / msinday + dayOffset) * msinday);
  if (validT - newestBase > 4 * msinday) {
    return `\
Too far into the future. \
Time you queried is ${formatTime(validT)} \
Furthest you can go is up to \
${formatTime(new Date(newestBase.valueOf() + 4 * msinday))}`;
  } else if (validT - newestBase < -30 * msinday) {
    return `\
Too far into the past. \
Time you queried is ${formatTime(validT)} \
Furthest you can go is up to \
${formatTime(new Date(newestBase.valueOf() - 30 * msinday))}`;
  }
  const baseTime = newestBase < validBase ? newestBase : validBase;

  return fetch(`\
https://charts.ecmwf.int/opencharts-api/v1/products/europe-air-quality-forecast-pollens/\
?valid_time=${formatTime(validT)}\
&base_time=${formatTime(baseTime)}\
&projection=cams_aq_${map.map}_europe\
&layer_name=composition_europe_pol_${species}_forecast_surface\
&format=png`)
    .then(resp => resp.json().data.link.href)
    .then(fetch)
    .then(res => res.arrayBuffer())
    .then(ImageScript.decode)
    .then(img => img.crop(map.x, map.y, 650, 400).resize(650, 650).encode());
})();
