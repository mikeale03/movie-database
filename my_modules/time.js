module.exports = {
    minToHourFormat: (min) => {
        let h = min>60 ? Math.floor((min/60)):0;
        let m = min - (h*60);
        return `${h}h ${m}min`;

         //s += h<10 ? '0'+h+':' : h+':';
         //s += m<10 ? '0'+s : m;
        //return s;
    }
}

