const abonnements = [];
var calculator = {
    getTarif: function (puissance, data, grille) {
        const monthsData = [];

        let abonnement = grille.prices.find((t) => t.puissance == puissance);
        if (abonnement) {
            let currentMonth = 0;
            let currentYear = 0;

            let monthData = {};
            for (let day = 0; day < data.length; day++) {
                let date = data[day].date.split("/");
                currentYear = parseInt(date[0]);

                if (date[1] != currentMonth) {
                    if (monthData.days) {
                        sumMonthData(monthData);
                    }
                    currentMonth = date[1];
                    monthData = {};
                    monthData.month = currentMonth;
                    monthData.year = currentYear;
                    monthData.firstDayDate = new Date(currentYear, +currentMonth - 1, 1);
                    monthData.days = [];
                    monthData.hasErrors = false;
                    monthData.numberOfDaysInMonth = new Date(currentYear, +currentMonth, 0).getDate();
                    monthData.aboPriceByDay = abonnement.abonnement / monthData.numberOfDaysInMonth;

                    monthsData.push(monthData);
                }

                let dayData = {
                    date: data[day].date,
                    hours: []
                };
                dayData.consoHC = 0;
                dayData.priceHC = 0;
                dayData.consoHP = 0;
                dayData.priceHP = 0;

                let hourIndex = 0;
                let firstHourData = {};
                while (hourIndex <= data[day].hours.length - 1) {
                    let hourData = {};

                    let hourPart = data[day].hours[hourIndex][0].split(":")[0];
                    //Si c'est la première heure, on la met de côté pour l'additionner avec le dernier pas
                    if (hourIndex == 0 && hourPart == "00") {
                        firstHourData.hour = hourPart + ":00:00";
                        firstHourData.conso = parseInt(data[day].hours[hourIndex][1]);
                        hourIndex++;
                    }
                    else {
                        hourData.hour = hourPart + ":00:00";
                        hourData.conso = parseInt(data[day].hours[hourIndex][1]);

                        let hourStep = 1;
                        if (hourIndex + hourStep <= data[day].hours.length - 1) {
                            let nextHourPart = data[day].hours[hourIndex + hourStep][0].split(":")[0];
                            while (hourPart == nextHourPart && (hourIndex + hourStep) < data[day].hours.length - 1) {
                                hourData.conso += parseInt(data[day].hours[hourIndex + hourStep][1]);
                                hourStep++;
                                nextHourPart = data[day].hours[hourIndex + hourStep][0].split(":")[0];
                            }
                        }

                        //Si c'est la dernière heure, on ajoute la première heure
                        if(hourPart == "00") {
                            hourData.conso += firstHourData.conso;
                            firstHourData = {};
                            hourStep++;
                        }

                        hourData.conso = hourData.conso / hourStep;
                        hourIndex += hourStep;

                        let currentHour = parseInt(hourPart);
                        const dayType = grille.getDayType(dayData, currentHour);

                        if (grille.hc.some(range => currentHour >= range.start && currentHour < range.end)) {
                            let prixKwhHC = abonnement[dayType].prixKwhHC;

                            hourData.type = dayType + " HC";
                            hourData.price = (((hourData.conso / 1000) * prixKwhHC) / 100);
                            dayData.consoHC += hourData.conso;
                            dayData.priceHC += hourData.price;
                        }
                        else {
                            let prixKwhHP = abonnement[dayType].prixKwhHP;
                            hourData.type = dayType + " HP";

                            hourData.price = (((hourData.conso / 1000) * prixKwhHP) / 100);
                            dayData.consoHP += hourData.conso;
                            dayData.priceHP += hourData.price;
                        }
                        dayData.hours.push(hourData);
                    }
                }

                dayData.conso = dayData.hours.reduce((a, b) => a + b.conso, 0);
                dayData.price = dayData.hours.reduce((a, b) => a + b.price, 0) + monthData.aboPriceByDay;
                monthData.days.push(dayData);
            }

            sumMonthData(monthData);
        }

        return monthsData;
    },
    calculateTarifForPeriod: function (monthsData, dateBegin, dateEnd) {
        let tarifForPeriod = {
            conso: 0,
            price: 0,
            months: []
        };

        //Take all months between dateBegin and dateEnd
        let months = monthsData.filter(m => m.firstDayDate >= dateBegin && m.firstDayDate <= dateEnd);

        tarifForPeriod.conso = months.filter(m => !isNaN(m.conso)).reduce((a, b) => a + b.conso, 0);
        tarifForPeriod.price = months.filter(m => !isNaN(m.price)).reduce((a, b) => a + b.price, 0);
        tarifForPeriod.months = months;

        return tarifForPeriod;
    }
}

function sumMonthData(monthData) {
    monthData.conso = monthData.days.filter(d => !isNaN(d.conso)).reduce((a, b) => a + b.conso, 0);
    monthData.price = monthData.days.filter(d => !isNaN(d.price)).reduce((a, b) => a + b.price, 0);
    const diffNumberOfDays = monthData.numberOfDaysInMonth - monthData.days.length;
    if (diffNumberOfDays > 0) {
        monthData.hasErrors = true;
        monthData.price += diffNumberOfDays * monthData.aboPriceByDay;
    }
}