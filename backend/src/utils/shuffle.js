// Fisher-Yates shuffle — mathematically unbiased, used by every serious platform
const shuffleArray = (array) => {
    const arr = [...array]; //never mutate the original array
    for(let i =arr.length - 1; i>0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = {shuffleArray};