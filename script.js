const calendar = document.getElementById('calendar');
let currentYear = 1945;

//let currentYear = new Date().getFullYear();


const months = [
  "January", "February", "March", "April", 
  "May", "June", "July", "August", 
  "September", "October", "November", "December"
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Define your events array here
const events = [
  {
    month: 4, day: 30, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Death_of_Adolf_Hitler',
    imageUrl: 'https://content.time.com/time/magazine/archive/covers/1945/1101450507_400.jpg',
    crop: { top: 27, right: 10, bottom: 14, left: 10 },  // Crop percentages
    position: { top: '-15%', left: '0%' },
    scale: 1.4,
    zIndexOverride: 22
  },
  {
    month: 5, day: 7, year: 1945,
    wikiUrl: 'https://www.trumanlibraryinstitute.org/wwii-75-marching-victory-10/',
    imageUrl: 'https://m.media-amazon.com/images/I/41eCBF0D5WL._AC_UF894,1000_QL80_.jpg',
    crop: { top: 0, right: 0, bottom: 0, left: 0 },  // Crop percentages
    position: { top: '-15%', left: '0%' },
    scale: 1.1,
    zIndexOverride: 20
  },
  {
    month: 2, day: 23, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Raising_the_Flag_on_Iwo_Jima',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Raising_the_Flag_on_Iwo_Jima%2C_larger_-_edit1.jpg',
    crop: { top: 30, right: 20, bottom: 0, left: 20 },  // Crop percentages
    position: { top: '-15%', left: '0%' },
    scale: 1.7,
    zIndexOverride: 200
  },
  {
    month: 4, day: 12, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/First_inauguration_of_Harry_S._Truman',
    imageUrl: 'https://www.whitehouse.gov/wp-content/uploads/2021/01/33_harry_s_truman.jpg',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 8, day: 6, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki#Hiroshima',
    imageUrl: 'https://media.cnn.com/api/v1/images/stellar/prod/200729173346-01-hiroshima-nagasaki-restricted.jpg?q=w_3000,c_fill',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 8, day: 9, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki#Nagasaki',
    imageUrl: 'https://www.osti.gov/opennet/manhattan-project-history/images/NagasakiCloud4.gif',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 7, day: 16, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Trinity_(nuclear_test)',
    imageUrl: 'https://wordpress.wbur.org/wp-content/uploads/2018/07/0716_trinity-1000x699.jpg',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 7, day: 5, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/1945_United_Kingdom_general_election',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Person_attlee2.jpg/220px-Person_attlee2.jpg',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 7, day: 3, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/James_F._Byrnes#Secretary_of_State',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/James_F._Byrnes_cph.3c32232.jpg/220px-James_F._Byrnes_cph.3c32232.jpg',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 5, day: 5, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Battle_of_Castle_Itter',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Schloss_Itter_in_1979.jpg/300px-Schloss_Itter_in_1979.jpg',
    crop: { top: 22, right: 20, bottom: 30, left: 20 },  // Crop percentages
    position: { top: '0%', left: '0%' },
    scale: 1.8,
    zIndexOverride: 200
  },
  {
    month: 8, day: 8, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Soviet_invasion_of_Manchuria',
    imageUrl: 'data:image/png;base64,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',
    crop: { top: 10, right: 32, bottom: 32, left: 12 },  // Crop percentages
    position: { top: '0%', left: '20%' },
    scale: 2,
    zIndexOverride: 200
  },
  {
    month: 8, day: 10, year: 1945,
    wikiUrl: 'https://www.theatlantic.com/international/archive/2015/08/emperor-hirohito-surrender-japan-hiroshima/400328/',
    imageUrl: 'https://www.historytoday.com/sites/default/files/hirohito.jpg',
    crop: { top: 0, right: 32, bottom: 57, left: 12 },  // Crop percentages
    position: { top: '50%', left: '20%' },
    scale: 2,
    zIndexOverride: 200
  },
  ,
  {
    month: 8, day: 15, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Surrender_of_Japan#Surrender',
    imageUrl: 'https://as1.ftcdn.net/v2/jpg/01/63/44/22/1000_F_163442271_oFv2C3LTyHPiCBZdgFuVBbtGPqE2FVUt.jpg',
    crop: { top: 25, right: 20, bottom: 20, left: 12 },  // Crop percentages
    position: { top: '-10%', left: '1%' },
    scale: 1.7,
    zIndexOverride: 200
  },
  {
    month: 4, day: 28, year: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Death_of_Benito_Mussolini',
    imageUrl: 'https://www.sandiegouniontribune.com/wp-content/uploads/migration/2011/12/13/00000169-0cec-dbbe-a16f-4eec557c0000.jpg?w=535',
    crop: { top: 25, right: 18, bottom: 20, left: 18 },  // Crop percentages
    position: { top: '-10%', left: '1%' },
    scale: 1.7,
    zIndexOverride: 200
  },
  {
    month: 12, day: 22, year: 1944,
    wikiUrl: 'https://en.wikipedia.org/wiki/Anthony_McAuliffe#%22NUTS!%22',
    imageUrl: 'https://image.spreadshirtmedia.com/image-server/v1/compositions/T23A1PA3989PT17X16Y29D1015793614W27939H19558/views/1,width=550,height=550,appearanceId=1,backgroundColor=FFFFFF,noPt=true/nuts-by-general-mcauliffe-black-mens-longsleeve-shirt.jpg',
    crop: { top: 0, right: 0, bottom: 0, left: 0 },  // Crop percentages
    position: { top: '-10%', left: '1%' },
    scale: 1.2,
    zIndexOverride: 200
  },
];


  
const textBlocks = [

  // Probs not gonna use this
];


const multiDayTextBlocks = [
  {
    startMonth: 2,
    startDay: 13,
    startYear: 1945,
    endMonth: 2,
    endDay: 15,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Bombing_of_Dresden',
    text: 'DRESDEN',
    fontSize: '2.4em',
    fontFamily: 'Arial',
    bold: true,
    color: 'black',
    backgroundColor: 'orange',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '40%', left: '12%' },
    scale: 1,
    height: 1,  // New simplified height property
    verticalOffset: 0,
    textWeek: [1],
    zIndexOverride: 20
  },
  {
    startMonth: 11,
    startDay: 30,
    startYear: 1939,
    endMonth: 3,
    endDay: 13,
    endYear: 1940,
    wikiUrl: 'https://en.wikipedia.org/wiki/Winter_War',
    text: 'THE WINTER WAR',
    fontSize: '2.3em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'RED',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '45%', left: '25%' },
    scale: 1,
    height: .8,  // New simplified height property
    verticalOffset: 1,
    textWeek: [3,8,13,18],
    zIndexOverride: 20
  },
  {
    startMonth: 3,
    startDay: 9,
    startYear: 1945,
    endMonth: 3,
    endDay: 10,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Bombing_of_Tokyo_(10_March_1945)',
    text: 'TOKYO',
    fontSize: '2.4em',
    fontFamily: 'Arial',
    bold: true,
    color: 'black',
    backgroundColor: 'orange',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '40%', left: '10%' },
    scale: 1,
    height: 1,  // New simplified height property
    verticalOffset: 0,
    textWeek: [1],
    zIndexOverride: 21
  },
  {
    startMonth: 2,
    startDay: 4,
    startYear: 1945,
    endMonth: 2,
    endDay: 11,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Yalta_Conference',
    text: 'YALTA',
    fontSize: '4em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'gold',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '30%', left: '33%' }, // Adjust the text 10% down and 20% from the left
    scale: 1.,
    height: 1,  // New simplified height property
    verticalOffset: 0,
    textWeek: [1],
    zIndexOverride: 20
  },
  {
    startMonth: 7,
    startDay: 17,
    startYear: 1945,
    endMonth: 8,
    endDay: 2,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Potsdam_Conference',
    text: 'POTSDAM',
    fontSize: '4em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'gold',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '30%', left: '%' }, // Adjust the text 10% down and 20% from the left
    scale: 1.,
    height: 1,  // New simplified height property
    verticalOffset: 0,
    textWeek: [2],
    zIndexOverride: 20
  },
  {
    startMonth: 12,
    startDay: 16,
    startYear: 1944,
    endMonth: 1,
    endDay: 28,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Battle_of_the_Bulge',
    text: 'BATTLE OF THE BULGE',
    fontSize: '2.3em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'LIGHTBLUE',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '45%', left: '15%' },
    scale: 1,
    height: .8,  // New simplified height property
    verticalOffset: 1,
    textWeek: [3,5],
    zIndexOverride: 20
  },
  {
    startMonth: 4,
    startDay: 16,
    startYear: 1945,
    endMonth: 5,
    endDay: 2,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Battle_of_Berlin',
    text: 'BATTLE OF BERLIN',
    fontSize: '2.3em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'RED',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '45%', left: '25%' },
    scale: 1,
    height: .8,  // New simplified height property
    verticalOffset: 25,  // New property to adjust vertical position
    textWeek: [2],  // Keep textWeek as before
    zIndexOverride: 9  // Example zIndexOverride
  },
  {
    startMonth: 2,
    startDay: 19,
    startYear: 1945,
    endMonth: 3,
    endDay: 26,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Battle_of_Iwo_Jima',
    text: 'IWO JIMA',
    fontSize: '3em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'lightblue',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '30%', left: '30%' },
    scale: 1,
    height: .8,  // New simplified height property
    verticalOffset: 0,
    textWeek: [2,5],
    zIndexOverride: 20
  },
  {
    startMonth: 4,
    startDay: 1,
    startYear: 1945,
    endMonth: 6,
    endDay: 25,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Battle_of_Okinawa',
    text: 'OKINAWA',
    fontSize: '3em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'lightblue',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '30%', left: '30%' },
    scale: 1,
    height: .8,  // New simplified height property
    verticalOffset: 0,
    textWeek: [1,8,13],
    zIndexOverride: 8
  },
  {
    startMonth: 6,
    startDay: 26,
    startYear: 1945,
    endMonth: 7,
    endDay: 2,
    endYear: 1945,
    wikiUrl: 'https://www.roberthjackson.org/nuremberg-event/the-london-conference-june-26-august-2-1945/',
    text: 'LONDON CONFERENCE',
    fontSize: '2em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'grey',
    crop: { top: 30, right: 0, bottom: 10, left: 0 },
    position: { top: '40%', left: '5%' },
    scale: 1,
    height: .8,  // New simplified height property
    verticalOffset: 0,
    textWeek: [1],
    zIndexOverride: 8
  },
  {
    startMonth: 5,
    startDay: 8,
    startYear: 1945,
    endMonth: 5,
    endDay: 8,
    endYear: 1945,
    wikiUrl: 'https://en.wikipedia.org/wiki/Victory_in_Europe_Day',
    text: 'VE',
    fontSize: '3.8em',
    fontFamily: '',
    bold: true,
    color: 'black',
    backgroundColor: 'white',
    crop: { top: 30, right: 0, bottom: 0, left: 0 },
    position: { top: '30%', left: '0%' },
    scale: 1,
    height: 1,  // New simplified height property
    verticalOffset: 0,
    textWeek: [1],
    zIndexOverride: 80
  }
];



  
  
function createMonthGrid(year) {
  calendar.innerHTML = ''; // Clear calendar

  for (let i = 0; i < 12; i++) {
    const month = i;
    const monthDiv = document.createElement('div');
    monthDiv.classList.add('month');

    const header = document.createElement('div');
    header.classList.add('month-header');
    header.textContent = months[month] + ' ' + (year < 0 ? Math.abs(year) + ' B.C.E' : year);
    monthDiv.appendChild(header);

    const weekdayRow = document.createElement('div');
    weekdayRow.classList.add('weekday-row');
    dayLabels.forEach(label => {
      const weekdayCell = document.createElement('div');
      weekdayCell.classList.add('weekday');
      weekdayCell.textContent = label;
      weekdayRow.appendChild(weekdayCell);
    });
    monthDiv.appendChild(weekdayRow);

    const daysDiv = document.createElement('div');
    daysDiv.classList.add('days');

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    for (let j = 0; j < firstDay; j++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('numeric-day');
      daysDiv.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.classList.add('numeric-day');
      dayCell.textContent = day;

      // Iterate over events to add images dynamically
      events.forEach((event, index) => {
        if (event.year === year && event.month === month + 1 && event.day === day) {
          const image = new Image();
          image.src = event.imageUrl;
          image.alt = 'Event Image';
          image.classList.add('OneDayEvent');
          image.style.maxWidth = '100%';
          image.style.maxHeight = '100%';
          image.style.position = 'relative';
          image.style.left = event.position.left || '0%';
          image.style.top = event.position.top || '0%';
          image.style.transform = `scale(${event.scale || 1})`;
          image.style.clipPath = `inset(${event.crop.top}% ${event.crop.right}% ${event.crop.bottom}% ${event.crop.left}%)`;
          image.style.overflow = 'hidden';
          image.style.zIndex = event.zIndexOverride || 10;
          image.addEventListener('click', function() {
            openModal(event.wikiUrl, index);
          });
          dayCell.appendChild(image);
        }
      });

      // Iterate over text blocks to add them dynamically
      textBlocks.forEach(block => {
        if (block.year === year && block.month === month + 1 && block.day === day) {
            const textBlock = document.createElement('div');
            textBlock.textContent = block.text;
            textBlock.classList.add('text-block');
            textBlock.style.left = block.position.left || '0%';
            textBlock.style.top = block.position.top || '0%';
            textBlock.style.fontSize = block.fontSize || '1em';
            textBlock.style.fontFamily = block.fontFamily || 'Arial';
            textBlock.style.fontWeight = block.bold ? 'bold' : 'normal';
            textBlock.style.color = block.color || 'black';
            textBlock.style.backgroundColor = block.backgroundColor || 'transparent';
            textBlock.style.zIndex = block.zIndexOverride || 10;
            textBlock.style.clipPath = `inset(${block.crop.top}% ${block.crop.right}% ${block.crop.bottom}% ${block.crop.left}%)`;
            textBlock.style.transform = `scale(${block.scale || 1})`; // Ensure the scale is applied
            
            // Adjust positioning to be relative to the container size, to ensure consistency across different zoom levels
            textBlock.style.left = `calc(${block.position.left || '0%'} + ${block.position.left})`;
            textBlock.style.top = `calc(${block.position.top || '0%'} + ${block.position.top})`;
    
            textBlock.addEventListener('click', function () {
                openModal(block.wikiUrl);
            });
            dayCell.appendChild(textBlock);
        }
    });
    
      daysDiv.appendChild(dayCell);
    }

    monthDiv.appendChild(daysDiv);
    calendar.appendChild(monthDiv);
  }

  // Call the function to create wrapped multi-day text blocks
  createWrappedMultiDayTextBlocks(year);
}


// Helper function to get the day index for a given date
function getDayIndex(year, month, day) {
  const startDate = new Date(year, month - 1, 1);
  const currentDate = new Date(year, month - 1, day);
  const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Adjust for the starting day of the week
  const startDayOfWeek = startDate.getDay(); // 0 (Sunday) - 6 (Saturday)
  
  return daysDiff + startDayOfWeek;
}




// Helper function to get the cell by date
function getCellByDate(date) {
  const monthIndex = date.getMonth() + 1; // Adjust month for 1-based index
  const day = date.getDate();
  const dayIndex = getDayIndex(date.getFullYear(), monthIndex, day);

  // Get the correct cell based on the day index
  return document.querySelector(`#calendar .month:nth-child(${monthIndex}) .days .numeric-day:nth-child(${dayIndex + 1})`);
}


function getWidthForRemainingDays(cell, days) {
  return cell.offsetWidth * days;
}

function createWrappedMultiDayTextBlocks(year) {
  multiDayTextBlocks.forEach(block => {
      const { startYear, startMonth, startDay, endYear, endMonth, endDay, textWeek } = block;

      // Only process the event if it overlaps with the current year
      if (startYear <= year && endYear >= year) {
          let startDate = new Date(startYear, startMonth - 1, startDay);
          let endDate = new Date(endYear, endMonth - 1, endDay);

          // Adjust the start and end dates to fit within the current year
          if (startYear < year) {
              startDate = new Date(year, 0, 1);  // Start from January 1 of the current year
          }
          if (endYear > year) {
              endDate = new Date(year, 11, 31);  // End at December 31 of the current year
          }

          let totalWeeks = 1;  // Start counting weeks from 1
          let currentWeek = 1;
          let firstDayOfEvent = new Date(startYear, startMonth - 1, startDay);

          // Calculate the total weeks since the event started, considering week transitions between months
          while (firstDayOfEvent < startDate) {
              if (firstDayOfEvent.getDay() === 0 || firstDayOfEvent.getDate() === 1) {
                  totalWeeks++;
              }
              firstDayOfEvent.setDate(firstDayOfEvent.getDate() + 1);
          }

          while (startDate <= endDate) {
              const currentMonth = startDate.getMonth();
              const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
              const currentCell = getCellByDate(startDate);

              if (!currentCell) break;

              const dayOfWeek = startDate.getDay();
              const daysToEndOfWeek = 6 - dayOfWeek;
              const daysToEndOfMonth = daysInMonth - startDate.getDate();
              const daysToEndOfEvent = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
              const daysInSegment = Math.min(daysToEndOfWeek, daysToEndOfMonth, daysToEndOfEvent) + 1;

              const blockElement = document.createElement('div');
              blockElement.classList.add('multi-day-text-block');

              if (block.zIndexOverride) {
                  blockElement.style.zIndex = block.zIndexOverride;
              }

              blockElement.style.height = `${currentCell.offsetHeight * block.height}px`;
              const offset = block.verticalOffset || 0;
              blockElement.style.top = `${currentCell.offsetTop + offset}px`;

              // Add text only if the current week (considering multi-year events) is in the textWeek array
              if (Array.isArray(textWeek) && textWeek.includes(totalWeeks)) {
                  const textElement = document.createElement('div');
                  textElement.textContent = block.text;
                  textElement.style.position = 'absolute';
                  textElement.style.top = block.position.top || '0%';
                  textElement.style.left = block.position.left || '0%';
                  textElement.style.fontSize = block.fontSize;
                  textElement.style.fontFamily = block.fontFamily;
                  textElement.style.fontWeight = block.bold ? 'bold' : 'normal';
                  textElement.style.color = block.color;

                  blockElement.appendChild(textElement);
              }

              blockElement.style.position = 'absolute';
              blockElement.style.left = `${currentCell.offsetLeft}px`;
              blockElement.style.width = `${currentCell.offsetWidth * daysInSegment}px`;
              blockElement.style.backgroundColor = block.backgroundColor;
              blockElement.style.clipPath = `inset(${block.crop.top}px ${block.crop.right}px ${block.crop.bottom}px ${block.crop.left}px)`;
              blockElement.style.transform = `scale(${block.scale})`;

              blockElement.addEventListener('click', () => openModal(block.wikiUrl));

              currentCell.parentElement.appendChild(blockElement);

              startDate.setDate(startDate.getDate() + daysInSegment);

              // Increment totalWeeks on new week (Sunday) or new month
              if (startDate.getDay() === 0 || startDate.getDate() === 1) {
                  totalWeeks++;
                  currentWeek = 1;  // Reset week counter when a new week or month starts
              } else {
                  currentWeek++;
              }
          }
      }
  });
}


// Helper function to get the cell by date
function getCellByDate(date) {
  const monthIndex = date.getMonth() + 1;
  const day = date.getDate();
  const dayIndex = getDayIndex(date.getFullYear(), monthIndex, day);

  return document.querySelector(`#calendar .month:nth-child(${monthIndex}) .days .numeric-day:nth-child(${dayIndex + 1})`);
}

// Helper function to get the day index for a given date
function getDayIndex(year, month, day) {
  const startDate = new Date(year, month - 1, 1);
  const currentDate = new Date(year, month - 1, day);
  const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  return daysDiff + startDate.getDay(); // Adjust for the starting day of the week
}













// Call this function after the calendar grid is created
createWrappedMultiDayTextBlocks(currentYear);


// Helper function to get the width for remaining days in the current week
function getWidthForRemainingDays(cell, days) {
  return cell.offsetWidth * days;
}

// Helper function to get the cell by date
function getCellByDate(date) {
  const monthIndex = date.getMonth() + 1; // Adjust month for 1-based index
  const day = date.getDate();
  const dayIndex = getDayIndex(date.getFullYear(), monthIndex, day);

  // Get the correct cell based on the day index
  return document.querySelector(`#calendar .month:nth-child(${monthIndex}) .days .numeric-day:nth-child(${dayIndex + 1})`);
}

// Helper function to get the day index for a given date
function getDayIndex(year, month, day) {
  const startDate = new Date(year, month - 1, 1);
  const currentDate = new Date(year, month - 1, day);
  const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  return daysDiff + startDate.getDay(); // Adjust for the starting day of the week
}

// Function to open the modal
function openModal(url) {
  const modal = document.getElementById('modal');
  const modalContent = document.querySelector('.modal-content');
  modal.style.display = 'block';
  modalContent.innerHTML = `<iframe src="${url}" frameborder="0"></iframe>`;
}



function openModal(wikiUrl) {
  const modalsContainer = document.getElementById("modalsContainer");

  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'block';
  modal.style.top = '10%';
  modal.style.left = '10%';

  const draggable = document.createElement('div');
  draggable.classList.add('draggable');
  draggable.textContent = 'Drag Me';

  const closeBtn = document.createElement('span');
  closeBtn.classList.add('close');
  closeBtn.innerHTML = '&times;';

  const iframeContainer = document.createElement('div');
  iframeContainer.classList.add('iframe-container');

  const iframe = document.createElement('iframe');
  iframe.classList.add('modal-content');
  iframe.src = wikiUrl;
  iframe.frameBorder = 0;
  iframe.style.width = '100%';
  iframe.style.height = 'calc(100% - 40px)'; // Adjust height for buttons

  // Create navigation buttons
  const navContainer = document.createElement('div');
  navContainer.classList.add('nav-buttons');
  
  const backBtn = document.createElement('button');
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', () => iframe.contentWindow.history.back());
  navContainer.appendChild(backBtn);
  
  const forwardBtn = document.createElement('button');
  forwardBtn.textContent = 'Forward';
  forwardBtn.addEventListener('click', () => iframe.contentWindow.history.forward());
  navContainer.appendChild(forwardBtn);

  iframeContainer.appendChild(navContainer);
  iframeContainer.appendChild(iframe);

  modal.appendChild(draggable);
  modal.appendChild(closeBtn);
  modal.appendChild(iframeContainer);
  modalsContainer.appendChild(modal);

  // Close modal on click of close button
  closeBtn.onclick = function() {
    modal.style.display = "none";
    modalsContainer.removeChild(modal);
  }

  // Make the modal draggable
  makeDraggable(modal);

  // Close the modal when clicking outside of the modal content
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
      modalsContainer.removeChild(modal);
    }
  }
}

  
  function makeDraggable(modal) {
    const draggable = modal.querySelector('.draggable');
    let offsetX = 0, offsetY = 0, startX = 0, startY = 0;
  
    draggable.onmousedown = dragMouseDown;
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
  
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      offsetX = startX - e.clientX;
      offsetY = startY - e.clientY;
      startX = e.clientX;
      startY = e.clientY;
      const newTop = modal.offsetTop - offsetY;
      const newLeft = modal.offsetLeft - offsetX;
  
      // Constraints to prevent dragging out of viewport
      const maxTop = window.innerHeight - modal.offsetHeight;
      const maxLeft = window.innerWidth - modal.offsetWidth;
  
      if (newTop >= 0 && newTop <= maxTop) {
        modal.style.top = newTop + "px";
      }
      if (newLeft >= 0 && newLeft <= maxLeft) {
        modal.style.left = newLeft + "px";
      }
    }
  
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  

function setYear(year) {
  currentYear = year;
  document.querySelector('.calendar-header').textContent = year < 0 ? Math.abs(year) + ' B.C.E' : year;
  createMonthGrid(year);
  document.getElementById('year-select').value = year; // Set dropdown to current year
}

function goBack() {
  currentYear--;
  setYear(currentYear);
}

function goForward() {
  currentYear++;
  setYear(currentYear);
}

function searchYear() {
  const input = document.getElementById('search-year').value.trim().toLowerCase();
  const isBce = document.getElementById('is-bce').checked;
  let year = parseInt(input);

  if (!isNaN(year)) {
    if (isBce) {
      year = -year;
    }
    setYear(year);
  }
}

// Trigger search on Enter key press
document.getElementById('search-year').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    searchYear();
  }
});

setYear(currentYear);

const yearSelect = document.getElementById('year-select');
for (let year = 2024; year >= -2000; year--) {
  const option = document.createElement('option');
  if (year < 0) {
    option.textContent = Math.abs(year) + " B.C.E";
  } else {
    option.textContent = year;
  }
  option.value = year;
  yearSelect.appendChild(option);
}

yearSelect.value = currentYear; // Set dropdown to current year on load

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    goBack();
  } else if (event.key === 'ArrowRight') {
    goForward();
  }
});


setYear(currentYear);
createWrappedMultiDayTextBlocks(currentYear); // Add this after the calendar grid is created

function setZoom(scale) {
  const container = document.getElementById('calendarContainer');
  container.style.transform = `scale(${scale})`;
}

// Set the default zoom level to 67%
setZoom(0.67);

// Add event listeners to control zoom via buttons or other inputs
document.getElementById('zoomInButton').addEventListener('click', function() {
  setZoom(0.75); // Example for zooming in
});

document.getElementById('zoomOutButton').addEventListener('click', function() {
  setZoom(0.5); // Example for zooming out
});