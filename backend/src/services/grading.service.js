/**
 * grading.service.js
 *
 * Pure business logic — no HTTP, no database, just math.
 * Takes arrays of responses and questions, returns score breakdown.
 *
 * Keeping this isolated means you can unit test it without spinning up
 * an Express server or a database connection.
 */
const calculateScore = (responses, questions) => {
     // Map of questionId (as string) -> question document, for O(1) lookups
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    let correct = 0, wrong = 0, skipped = 0, totalMarks = 0;

    for (const response of responses){
        const question = questionMap.get(response.questionId.toString());
        if(!question) continue;

        if(response.selectedOption === null || response.selectedOption === undefined){
            skipped ++;
        }else if (response.selectedOption === question.correctOption){
            correct++;
           //totalMarks -= question.negativeMarks;    // negative marking (JEE-style)
        }
    }

    const maxMarks = questions.reduce((s, q) => s+q.marks, 0);
    const finalScore = Math.max(0, totalMarks); //score can't go below 0

    return {
        correct,
        wrong,
        skipped,
        score: parseFloat(finalScore.toFixed(2)),
        maxMarks: parseFloat(maxMarks.toFixed(2)),
        percentage: maxMarks > 0 ? Math.round((finalScore/maxMarks) * 100) : 0,
    }
}

module.exports = {calculateScore};