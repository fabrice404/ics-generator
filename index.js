const Table = require('cli-table');
const moment = require('moment-timezone');
const fs = require('fs');
const nodeSsh = require('node-ssh');
const ssh = new nodeSsh();
const path = require('path');

const vEVENT = (event) => {
  const icsEvent = [];
  if (event.description) {
    icsEvent.push(`DESCRIPTION:${event.description}`);
  }
  icsEvent.push(`DTSTART:${moment(event.begin).format('YYYYMMDDTHHmmss')}`);
  icsEvent.push(`DTEND:${moment(event.end).format('YYYYMMDDTHHmmss')}`);

  icsEvent.push(`DTSTAMP:${moment().format('YYYYMMDDTHHmmss')}`);

  icsEvent.push(`SUMMARY:${event.icon} ${event.name}`);

  icsEvent.push(`UID:${moment(event.begin).format('YYYYMMDDTHHmmss')}`);

  return `BEGIN:VEVENT\n${icsEvent.sort().join('\n')}\nEND:VEVENT`;
}

const vCALENDAR = (calendar) => {
  const icsEvents = calendar.map(vEVENT)

  const icsCalendar = [];
  icsCalendar.push('BEGIN:VCALENDAR')
  icsCalendar.push('VERSION:2.0')
  icsCalendar.push('PRODID:-//ical-generator//NONSGML Event Calendar//EN')
  icsCalendar.push(icsEvents.join('\n'))
  icsCalendar.push('END:VCALENDAR')

  return icsCalendar.join('\n');
}

const INPUT = `${__dirname}/input`
const OUTPUT = `${__dirname}/output`

fs.readdir(INPUT, (errFolder, files) => {
  if (errFolder) {
    throw errFolder;
  }
  files.filter(file => path.extname(file).toLowerCase() === '.json' && file !== 'sample.json')
    .forEach(file => {
      fs.readFile(`${INPUT}/${file}`, { encoding: 'utf-8' }, (errFile, content) => {
        if (errFile) {
          throw errFile;
        }
        const name = path.normalize(file).slice(0, -5);
        const { deploy, events } = JSON.parse(content);
        const vcal = vCALENDAR(events);
        const outputFile = `${OUTPUT}/${name}.ics`;
        fs.writeFile(outputFile, vcal, (errWrite) => {
          if (errFile) {
            throw errWrite;
          }
          console.log(`${outputFile} created!`)

          ssh.connect({ host, username, password, port } = deploy)
            .then(() => {
              ssh.putFile(outputFile, deploy.location)
                .then(() => {
                  console.log(`${outputFile} deployed to ${deploy.location}!`)
                  ssh.dispose();
                })
                .catch(err => { throw err });
            })
            .catch(err => { throw err });
        });
      })
    });
});
