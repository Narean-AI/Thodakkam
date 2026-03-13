let studentHistory = {};

function saveStudentResult(studentId, result) {

  if (!studentHistory[studentId]) {
    studentHistory[studentId] = [];
  }

  studentHistory[studentId].push(result);

}

function getStudentHistory(studentId) {
  return studentHistory[studentId] || [];
}

module.exports = {
  saveStudentResult,
  getStudentHistory
};