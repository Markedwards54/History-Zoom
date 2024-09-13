const calendar = document.getElementById('calendar');
let currentYear = 1938;
;

const months = [
  "January", "February", "March", "April", 
  "May", "June", "July", "August", 
  "September", "October", "November", "December"
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Arrays to hold parsed events and multi-day text blocks
let events = [];
let multiDayTextBlocks = [];

// Helper function to load CSV files and parse them
function loadCSVFiles(callback) {
  console.log('Starting to load CSV files...');

  // Load events.csv
  Papa.parse('events.csv', {
      download: true,
      header: true,
      complete: function(results) {
          events = results.data.map(event => ({
              ...event,
              crop: {
                  top: parseFloat(event.croptop) || 0,
                  right: parseFloat(event.cropright) || 0,
                  bottom: parseFloat(event.cropbottom) || 0,
                  left: parseFloat(event.cropleft) || 0
              },
              position: {
                  top: event.positiontop || '0%',
                  left: event.positionleft || '0%'
              },
              scale: parseFloat(event.scale) || 1,
              zIndexOverride: parseInt(event.zIndexOverride, 10) || 10
          }));
          console.log('Parsed Events:', events);
          callback(); // Trigger the callback after events are loaded
      },
      error: function(error) {
          console.error('Error loading events.csv:', error);
      }
  });

  // Load multiDayTextBlocks.csv
 // Load multiDayTextBlocks.csv
 Papa.parse('multiDayTextBlocks.csv', {
    download: true,
    header: true,
    complete: function(results) {
        console.log('Raw parsed CSV data:', results.data);  // Check this output first

        multiDayTextBlocks = results.data.map(block => ({
            startMonth: parseInt(block.startMonth, 10) || 0,
            startDay: parseInt(block.startDay, 10) || 0,
            startYear: parseInt(block.startYear, 10) || 0,
            endMonth: parseInt(block.endMonth, 10) || 0,
            endDay: parseInt(block.endDay, 10) || 0,
            endYear: parseInt(block.endYear, 10) || 0,
            wikiUrl: block.wikiUrl || '',
            text: block.text || '',
            fontSize: block.fontSize || '1em',
            fontFamily: block.fontFamily || 'Arial',
            bold: block.bold ? block.bold.toLowerCase() === 'true' : false,
            color: block.color || 'black',
            backgroundColor: block.backgroundColor || 'white',
            crop: {
                top: parseFloat(block.croptop) || 0,
                right: parseFloat(block.cropright) || 0,
                bottom: parseFloat(block.cropbottom) || 0,
                left: parseFloat(block.cropleft) || 0
            },
            position: {
                top: block.positiontop || '0%',
                left: block.positionleft || '0%'
            },
            scale: parseFloat(block.scale) || 1,
            height: parseFloat(block.height) || 1,
            verticalOffset: parseFloat(block.verticalOffset) || 0,
            textWeek: block.textWeek ? block.textWeek.split(',').map(Number) : [],
            zIndexOverride: parseInt(block.zIndexOverride, 10) || 0
        }));

        console.log('Parsed multiDayTextBlocks:', multiDayTextBlocks);
        callback(); // Trigger the callback after multiDayTextBlocks are loaded
    },
    error: function(error) {
        console.error('Error loading multiDayTextBlocks.csv:', error);
    }
});


}


// Function to create the calendar grid
function createMonthGrid(year) {
    calendar.innerHTML = ''; // Clear the calendar

    for (let i = 0; i < 12; i++) {
        const month = i;
        const monthDiv = document.createElement('div');
        monthDiv.classList.add('month');

        const header = document.createElement('div');
        header.classList.add('month-header');
        header.textContent = `${months[month]} ${year < 0 ? Math.abs(year) + ' B.C.E' : year}`;
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

                // Add dataset properties
    dayCell.dataset.year = year;
    dayCell.dataset.month = month + 1;  // month is 0-based, so add 1
    dayCell.dataset.day = day;

            // Add events dynamically
            events.forEach((event, index) => {
                if (event.year == year && event.month == month + 1 && event.day == day) {
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

            daysDiv.appendChild(dayCell);
        }

        monthDiv.appendChild(daysDiv);
        calendar.appendChild(monthDiv);
    }

    // Call the function to create wrapped multi-day text blocks
    createWrappedMultiDayTextBlocks(year);
}




// Function to handle multi-day text blocks
function createWrappedMultiDayTextBlocks(year) {
    multiDayTextBlocks.forEach(block => {
        const { startYear, startMonth, startDay, endYear, endMonth, endDay, textWeek, crop, verticalOffset, zIndexOverride } = block;

        if (startYear <= year && endYear >= year) {
            let startDate = new Date(startYear, startMonth - 1, startDay);
            let endDate = new Date(endYear, endMonth - 1, endDay);

            // Adjust start and end dates to fit within the current year
            if (startYear < year) startDate = new Date(year, 0, 1);
            if (endYear > year) endDate = new Date(year, 11, 31);

            let totalWeeks = 1;
            let firstDayOfEvent = new Date(startYear, startMonth - 1, startDay);

            // Calculate total weeks since the event started
            while (firstDayOfEvent < startDate) {
                if (firstDayOfEvent.getDay() === 0 || firstDayOfEvent.getDate() === 1) {
                    totalWeeks++;
                }
                firstDayOfEvent.setDate(firstDayOfEvent.getDate() + 1);
            }

            // Process weeks from startDate to endDate
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
                }
            }
        }
    });
}





function createBlockElement(block, startCell, weekEndDate, weekIndex, calendar) {
    // Ensure all properties from the block are being used
    const { textWeek, crop, verticalOffset, zIndexOverride, text, wikiUrl, fontSize, fontFamily, bold, color, backgroundColor } = block;

    console.log('Applying block properties:', { textWeek, wikiUrl, crop, verticalOffset, zIndexOverride });

    const blockElement = document.createElement('div');
    blockElement.classList.add('multi-day-text-block');

    const startDate = new Date(startCell.dataset.year, startCell.dataset.month - 1, startCell.dataset.day);
    const endDate = new Date(weekEndDate.getFullYear(), weekEndDate.getMonth(), weekEndDate.getDate());

    // Calculate the total number of days spanned by this block
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const blockWidth = startCell.offsetWidth * totalDays;

    if (isNaN(blockWidth)) {
        console.error(`Invalid block width calculation for block: ${text}`);
        console.log(`Start date: ${startDate.toDateString()}, End date: ${endDate.toDateString()}`);
        return;
    }

    // Set block dimensions based on the number of days
    blockElement.style.width = `${blockWidth}px`;
    blockElement.style.position = 'absolute';
    blockElement.style.left = `${startCell.offsetLeft}px`;
    blockElement.style.top = `${startCell.offsetTop + (verticalOffset || 0)}px`;
    blockElement.style.height = `${startCell.offsetHeight * (block.height || 1)}px`;
    blockElement.style.backgroundColor = backgroundColor || 'transparent';
    blockElement.style.zIndex = zIndexOverride || 1;

    // Apply cropping if defined
    if (crop) {
        blockElement.style.clipPath = `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;
    }

    console.log(`Block top: ${startCell.offsetTop}px, left: ${startCell.offsetLeft}px`);

    // Add text only if this week is specified in textWeek
    if (!textWeek || textWeek.includes(weekIndex + 1)) {
        const textElement = document.createElement('div');
        textElement.textContent = text || '';
        textElement.style.position = 'relative';
        textElement.style.top = block.position.top || '0%';
        textElement.style.left = block.position.left || '0%';
        textElement.style.fontSize = fontSize || '1em';
        textElement.style.fontFamily = fontFamily || 'Arial';
        textElement.style.fontWeight = bold ? 'bold' : 'normal';
        textElement.style.color = color || 'black';

        blockElement.appendChild(textElement);
    }

    calendar.appendChild(blockElement);

    // Add a click event to open the wiki URL in a modal
    if (wikiUrl) {
        blockElement.addEventListener('click', () => openModal(wikiUrl));
        blockElement.style.cursor = 'pointer';
    }
}


// Helper function to get the day index for a given date
function getDayIndex(year, month, day) {
    const startDate = new Date(year, month - 1, 1);
    const currentDate = new Date(year, month - 1, day);
    const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const dayIndex = daysDiff + startDate.getDay(); // Adjust for the starting day of the week
  
    console.log(`getDayIndex - Year: ${year}, Month: ${month}, Day: ${day}, Calculated Day Index: ${dayIndex}`);
    
    return dayIndex;
  }
  

// Helper function to get the cell by date
function getCellByDate(date) {
    const monthIndex = date.getMonth(); // 0-based index
    const day = date.getDate();
    const dayIndex = getDayIndex(date.getFullYear(), monthIndex + 1, day);
  
    const cell = document.querySelector(`#calendar .month:nth-child(${monthIndex + 1}) .days .numeric-day:nth-child(${dayIndex + 1})`);
    
    if (cell) {
      console.log(`getCellByDate - Date: ${date.toDateString()}, Cell found.`);
    } else {
      console.warn(`getCellByDate - Date: ${date.toDateString()}, Cell NOT found.`);
    }
  
    return cell;
  }




// Set up the calendar for the initial year
function setYear(year) {
    currentYear = year;
    document.querySelector('.calendar-header').textContent = year < 0 ? Math.abs(year) + ' B.C.E' : year;
    createMonthGrid(year);
    document.getElementById('year-select').value = year;
}

// Initialize the calendar after loading the CSV files
window.onload = function() {
    loadCSVFiles(() => {
        setYear(currentYear);
    });
};

// Navigation and other action functions
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

// Load the initial year
setYear(currentYear);

// Add years to the dropdown list
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

// Add keyboard navigation for year changes
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        goBack();
    } else if (event.key === 'ArrowRight') {
        goForward();
    }
});

// Modal functionality
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

    const iframe = document.createElement('iframe');
    iframe.classList.add('modal-content');
    iframe.src = wikiUrl;

    modal.appendChild(draggable);
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
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



// Function to make modals draggable
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

// Function to set zoom level (optional)
function setZoom(scale) {
    const container = document.getElementById('calendarContainer');
    if (container) {
        container.style.transform = `scale(${scale})`;
    } else {
        console.error('Calendar container not found for zooming.');
    }
}

// Example to set default zoom level
setZoom(0.67);

// Function to refresh the calendar
function refreshCalendar() {
    setYear(currentYear); // Refresh the calendar by setting the year again
}

// Add an event listener for the resize event (triggered by zooming in or out)
window.addEventListener('resize', function() {
    clearTimeout(window.refreshTimeout); // Clear any previous timeouts
    window.refreshTimeout = setTimeout(refreshCalendar, 500); // Add a delay to prevent excessive refreshes
});


