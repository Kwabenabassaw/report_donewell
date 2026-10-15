import React from "react"
import Link from "next/link"
import { School, User, ShieldCheck } from "lucide-react"
import { ReportCardData } from "@/server/services/ReportService"
import { ReportTemplateConfig } from "@/server/services/ReportTemplateService"

interface ReportCardViewProps {
  reportData: ReportCardData
  templateConfig: ReportTemplateConfig
  isDesignPreview?: boolean
}

export function ReportCardView({
  reportData,
  templateConfig,
  isDesignPreview = false,
}: ReportCardViewProps) {
  const {
    school,
    student,
    class: targetClass,
    academicSession,
    performance,
    subjects,
    evaluation,
    verification,
  } = reportData

  // Color Palette Definitions
  const colorMap = {
    slate: {
      headerBadge: "bg-slate-900 text-white",
      perfStrip: "bg-slate-900 text-white",
      tableHeader: "bg-slate-100 text-slate-800 border-slate-300",
      accentText: "text-slate-900",
      borderAccent: "border-slate-800",
      highlightAverage: "text-emerald-400",
      highlightGpa: "text-amber-400",
    },
    navy: {
      headerBadge: "bg-blue-950 text-white",
      perfStrip: "bg-blue-950 text-white",
      tableHeader: "bg-blue-50/80 text-blue-950 border-blue-200",
      accentText: "text-blue-950",
      borderAccent: "border-blue-900",
      highlightAverage: "text-cyan-300",
      highlightGpa: "text-amber-300",
    },
    emerald: {
      headerBadge: "bg-emerald-900 text-white",
      perfStrip: "bg-emerald-950 text-white",
      tableHeader: "bg-emerald-50/80 text-emerald-950 border-emerald-200",
      accentText: "text-emerald-950",
      borderAccent: "border-emerald-800",
      highlightAverage: "text-emerald-300",
      highlightGpa: "text-amber-300",
    },
    burgundy: {
      headerBadge: "bg-rose-950 text-white",
      perfStrip: "bg-rose-950 text-white",
      tableHeader: "bg-rose-50/80 text-rose-950 border-rose-200",
      accentText: "text-rose-950",
      borderAccent: "border-rose-900",
      highlightAverage: "text-pink-300",
      highlightGpa: "text-amber-300",
    },
    indigo: {
      headerBadge: "bg-indigo-950 text-white",
      perfStrip: "bg-indigo-950 text-white",
      tableHeader: "bg-indigo-50/80 text-indigo-950 border-indigo-200",
      accentText: "text-indigo-950",
      borderAccent: "border-indigo-900",
      highlightAverage: "text-indigo-300",
      highlightGpa: "text-amber-300",
    },
    amber: {
      headerBadge: "bg-amber-950 text-white",
      perfStrip: "bg-amber-950 text-white",
      tableHeader: "bg-amber-50/80 text-amber-950 border-amber-200",
      accentText: "text-amber-950",
      borderAccent: "border-amber-800",
      highlightAverage: "text-yellow-300",
      highlightGpa: "text-lime-300",
    },
  }

  const colors = colorMap[templateConfig.accentColor] || colorMap.slate

  // Calculate dynamic grid columns for Performance Summary Strip
  const activeMetricsCount = [
    templateConfig.showClassPosition,
    templateConfig.showOverallTotal,
    templateConfig.showTermAverage,
    templateConfig.showTermGpa,
  ].filter(Boolean).length

  // Calculate dynamic table column count
  let subjectColCount = 1 // Subject name is always visible
  if (templateConfig.showCaScore) subjectColCount++
  if (templateConfig.showExamScore) subjectColCount++
  if (templateConfig.showTotalScore) subjectColCount++
  if (templateConfig.showGrade) subjectColCount++
  if (templateConfig.showGradeInterpretation) subjectColCount++
  if (templateConfig.showSubjectPosition) subjectColCount++
  if (templateConfig.showTeacherRemarks) subjectColCount++

  return (
    <div className="a4-report-sheet w-full max-w-4xl bg-white text-slate-900 border border-slate-300 shadow-lg print:shadow-none print:border-none p-6 md:p-10 print:p-0 flex flex-col gap-4 sm:gap-6 print:gap-0 font-sans mx-auto transition-all">
      {/* ======================================================== */}
      {/* 1. SCHOOL LETTERHEAD & HEADER                            */}
      {/* ======================================================== */}
      {templateConfig.headerLayout === "CLASSIC_CENTERED" && (
        <div className={`flex flex-row items-center justify-between border-b-2 ${colors.borderAccent} pb-4 md:pb-5 print:pb-3 gap-4 print:gap-4`}>
          {templateConfig.showSchoolCrest && (
            <div className="h-16 w-16 md:h-20 md:w-20 print:h-16 print:w-16 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 text-primary overflow-hidden">
              {school.crestUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={school.crestUrl} alt="Crest" className="h-full w-full object-contain" />
              ) : (
                <School className="h-8 w-8 md:h-10 md:w-10 print:h-8 print:w-8" />
              )}
            </div>
          )}

          <div className="flex-1 text-center">
            <h1 className="text-xl md:text-2xl print:text-xl font-black uppercase tracking-wider text-slate-900 leading-tight">
              {school.name}
            </h1>
            {templateConfig.showSchoolMotto && school.motto && (
              <p className="text-xs print:text-xs italic text-slate-600 font-serif mt-0.5">
                &ldquo;{school.motto}&rdquo;
              </p>
            )}
            {templateConfig.showContactDetails && (
              <p className="text-xs print:text-[11px] text-slate-600 mt-1">
                {school.postalAddress} | Phone: {school.phone} | Email: {school.email}
              </p>
            )}
            <div
              className={`inline-block mt-2 print:mt-1 px-3 py-0.5 print:py-1 print:px-3 ${colors.headerBadge} text-[11px] print:text-xs font-bold uppercase tracking-widest rounded-xs shadow-xs`}
            >
              {templateConfig.reportTitle || "Official Terminal Academic Report"}
            </div>
          </div>

          {templateConfig.showSchoolCode && (
            <div className="h-16 w-16 md:h-20 md:w-20 print:h-16 print:w-18 flex-shrink-0 flex flex-col items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded text-center">
              <span className="text-[9px] print:text-[9px] uppercase tracking-wider font-bold text-slate-500">
                School Code
              </span>
              <span className="text-xs print:text-xs font-mono font-black text-slate-800 mt-0.5">
                {school.code}
              </span>
            </div>
          )}
        </div>
      )}

      {templateConfig.headerLayout === "MODERN_SPLIT" && (
        <div className={`flex flex-row items-center justify-between border-b-2 ${colors.borderAccent} pb-4 md:pb-5 print:pb-3 gap-4 print:gap-4`}>
          <div className="flex items-center gap-3 print:gap-3 flex-1">
            {templateConfig.showSchoolCrest && (
              <div className="h-16 w-16 md:h-20 md:w-20 print:h-16 print:w-16 flex-shrink-0 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary overflow-hidden">
                {school.crestUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={school.crestUrl} alt="Crest" className="h-full w-full object-contain" />
                ) : (
                  <School className="h-8 w-8 md:h-10 md:w-10 print:h-8 print:w-8" />
                )}
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl print:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                {school.name}
              </h1>
              {templateConfig.showSchoolMotto && school.motto && (
                <p className="text-xs print:text-xs italic text-slate-600 font-serif">
                  &ldquo;{school.motto}&rdquo;
                </p>
              )}
              {templateConfig.showContactDetails && (
                <p className="text-[11px] print:text-[11px] text-slate-500 mt-1">
                  {school.postalAddress} • {school.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className={`px-2.5 py-0.5 print:py-1 print:px-3 ${colors.headerBadge} text-xs print:text-xs font-bold uppercase tracking-wider rounded-xs mb-1 print:mb-1`}>
              {templateConfig.reportTitle || "Terminal Academic Report"}
            </div>
            {templateConfig.showSchoolCode && (
              <span className="text-xs print:text-xs font-mono font-semibold text-slate-600">
                Code: {school.code}
              </span>
            )}
          </div>
        </div>
      )}

      {templateConfig.headerLayout === "MINIMAL_BANNER" && (
        <div className={`flex flex-col border-b-2 ${colors.borderAccent} pb-3 md:pb-4 print:pb-2`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 print:gap-3">
              {templateConfig.showSchoolCrest && (
                <div className="h-12 w-12 md:h-14 md:w-14 print:h-12 print:w-12 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 text-primary">
                  {school.crestUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={school.crestUrl} alt="Crest" className="h-full w-full object-contain" />
                  ) : (
                    <School className="h-6 w-6 print:h-6 print:w-6" />
                  )}
                </div>
              )}
              <div>
                <h1 className="text-lg md:text-xl print:text-lg font-black uppercase text-slate-900 tracking-wide leading-tight">
                  {school.name}
                </h1>
                {templateConfig.showSchoolMotto && school.motto && (
                  <p className="text-[11px] print:text-[11px] italic text-slate-500 font-serif">
                    {school.motto}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className={`text-[10px] print:text-xs font-bold uppercase px-2 py-0.5 print:py-1 print:px-2.5 ${colors.headerBadge} rounded-xs inline-block`}>
                {templateConfig.reportTitle || "Official Report"}
              </span>
              {templateConfig.showSchoolCode && (
                <p className="text-[11px] print:text-xs font-mono text-slate-600 mt-1">
                  {school.code}
                </p>
              )}
            </div>
          </div>

          {templateConfig.showContactDetails && (
            <p className="text-[10px] print:text-[10px] text-slate-500 mt-1.5 print:mt-1 text-center border-t border-slate-100 pt-1">
              {school.postalAddress} | Phone: {school.phone} | Email: {school.email}
            </p>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. STUDENT & ACADEMIC INFO BOX                           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 print:gap-2.5 bg-slate-50 border border-slate-200 p-3 sm:p-4 print:p-2.5 rounded-xs text-xs print:text-[11px]">
        <div className="sm:col-span-2 flex items-center gap-2.5 print:gap-2">
          {templateConfig.showStudentPhoto && (
            <div className="h-10 w-10 sm:h-12 sm:w-12 print:h-10 print:w-10 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0 text-slate-500 overflow-hidden">
              {student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 print:h-5 print:w-5" />
              )}
            </div>
          )}
          <div>
            <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
              Student Full Name
            </span>
            <span className="font-bold text-slate-900 text-sm print:text-sm">{student.fullName}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
            Student ID Number
          </span>
          <span className="font-mono font-bold text-slate-900 print:text-[11px]">{student.idNumber}</span>
        </div>

        <div>
          <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
            Class & Grade Level
          </span>
          <span className="font-bold text-slate-900 print:text-[11px]">
            {targetClass.name} ({targetClass.gradeLevel})
          </span>
        </div>

        {templateConfig.showGender && (
          <div className="mt-0.5 print:mt-0">
            <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
              Gender {templateConfig.showRollNumber && student.rollNumber ? "/ Roll No" : ""}
            </span>
            <span className="font-semibold text-slate-800 print:text-[11px]">
              {student.gender}{" "}
              {templateConfig.showRollNumber && student.rollNumber ? `/ #${student.rollNumber}` : ""}
            </span>
          </div>
        )}

        {templateConfig.showDateOfBirth && (
          <div className="mt-0.5 print:mt-0">
            <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
              Date of Birth
            </span>
            <span className="font-semibold text-slate-800 print:text-[11px]">
              {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "Not Specified"}
            </span>
          </div>
        )}

        <div className="mt-0.5 print:mt-0">
          <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
            Academic Session
          </span>
          <span className="font-bold text-slate-900 print:text-[11px]">
            {academicSession.academicYear} — {academicSession.termName}
          </span>
        </div>

        {templateConfig.showNextTermResumption && (
          <div className="mt-0.5 print:mt-0">
            <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
              Term Resumption
            </span>
            <span className="font-semibold text-slate-800 print:text-[11px]">
              {academicSession.nextTermResumption
                ? new Date(academicSession.nextTermResumption).toLocaleDateString()
                : "To Be Announced"}
            </span>
          </div>
        )}

        {templateConfig.showAttendanceMetrics && (
          <div className="mt-0.5 print:mt-0">
            <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
              Term Attendance
            </span>
            <span className="font-semibold text-slate-800 print:text-[11px]">
              {evaluation.daysPresent} / {evaluation.totalSchoolDays} days ({evaluation.attendancePercentage}%)
            </span>
          </div>
        )}

        <div className="mt-0.5 print:mt-0">
          <span className="text-[10px] print:text-[9.5px] text-slate-500 uppercase tracking-wider font-semibold block">
            Report Status
          </span>
          <span className="font-mono font-bold text-emerald-700 uppercase print:text-[11px]">
            {performance.status}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ACADEMIC PERFORMANCE SUMMARY STRIP                    */}
      {/* ======================================================== */}
      {activeMetricsCount > 0 && (
        <div
          className={`grid grid-cols-${activeMetricsCount} gap-1.5 sm:gap-2 ${colors.perfStrip} p-2 sm:p-2.5 print:py-2 print:px-2 rounded-xs text-center`}
          style={{ gridTemplateColumns: `repeat(${activeMetricsCount}, minmax(0, 1fr))` }}
        >
          {templateConfig.showClassPosition && (
            <div>
              <span className="text-[9px] print:text-[9.5px] uppercase tracking-wider font-bold text-slate-300 block">
                Class Position
              </span>
              <span className="text-lg sm:text-xl print:text-base font-black font-mono">
                #{performance.classPosition}{" "}
                <span className="text-xs print:text-[10px] font-normal text-slate-400">/ {performance.cohortSize}</span>
              </span>
            </div>
          )}

          {templateConfig.showOverallTotal && (
            <div>
              <span className="text-[9px] print:text-[9.5px] uppercase tracking-wider font-bold text-slate-300 block">
                Overall Total
              </span>
              <span className="text-lg sm:text-xl print:text-base font-black font-mono">
                {performance.totalScore.toFixed(1)}
              </span>
            </div>
          )}

          {templateConfig.showTermAverage && (
            <div>
              <span className="text-[9px] print:text-[9.5px] uppercase tracking-wider font-bold text-slate-300 block">
                Term Average
              </span>
              <span className={`text-lg sm:text-xl print:text-base font-black font-mono ${colors.highlightAverage}`}>
                {performance.averageScore.toFixed(1)}%
              </span>
            </div>
          )}

          {templateConfig.showTermGpa && (
            <div>
              <span className="text-[9px] print:text-[9.5px] uppercase tracking-wider font-bold text-slate-300 block">
                Term GPA
              </span>
              <span className={`text-lg sm:text-xl print:text-base font-black font-mono ${colors.highlightGpa}`}>
                {performance.gpa !== null ? performance.gpa.toFixed(2) : "—"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ACADEMIC SUBJECTS TABLE                               */}
      {/* ======================================================== */}
      <div className="border border-slate-300 rounded-xs overflow-hidden">
        <table className="w-full text-xs print:text-[11px] text-left border-collapse">
          <thead>
            <tr className={`${colors.tableHeader} border-b text-[10px] sm:text-[11px] print:text-[10px] font-bold uppercase tracking-wider`}>
              <th className="p-1.5 sm:p-2 print:py-1.5 print:px-2 border-r border-slate-300">Subject</th>
              {templateConfig.showCaScore && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center border-r border-slate-300 w-16 print:w-14">CA (30)</th>
              )}
              {templateConfig.showExamScore && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center border-r border-slate-300 w-16 print:w-16">Exam (70)</th>
              )}
              {templateConfig.showTotalScore && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center border-r border-slate-300 w-20 print:w-16">Total (100)</th>
              )}
              {templateConfig.showGrade && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center border-r border-slate-300 w-14 print:w-12">Grade</th>
              )}
              {templateConfig.showGradeInterpretation && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-2 text-center border-r border-slate-300 w-24 print:w-24">Interpretation</th>
              )}
              {templateConfig.showSubjectPosition && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center border-r border-slate-300 w-16 print:w-12">Rank</th>
              )}
              {templateConfig.showTeacherRemarks && (
                <th className="p-1.5 sm:p-2 print:py-1.5 print:px-2 min-w-36 print:min-w-28">Remarks</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {subjects.map((sub, idx) => (
              <tr key={sub.subjectId} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                <td className="p-1.5 sm:p-2 print:py-1.5 print:px-2 font-semibold border-r border-slate-200">
                  {sub.subjectName}{" "}
                  <span className="text-[10px] print:text-[9.5px] text-slate-500 font-mono">({sub.subjectCode})</span>
                </td>
                {templateConfig.showCaScore && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center font-mono border-r border-slate-200">
                    {sub.caWeightedScore.toFixed(1)}
                  </td>
                )}
                {templateConfig.showExamScore && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center font-mono border-r border-slate-200">
                    {sub.examWeightedScore.toFixed(1)}
                  </td>
                )}
                {templateConfig.showTotalScore && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                    {sub.totalScore.toFixed(1)}
                  </td>
                )}
                {templateConfig.showGrade && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center font-bold font-mono border-r border-slate-200">
                    {sub.grade}
                  </td>
                )}
                {templateConfig.showGradeInterpretation && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-2 text-center text-[11px] print:text-[10.5px] text-slate-700 border-r border-slate-200">
                    {sub.interpretation || "—"}
                  </td>
                )}
                {templateConfig.showSubjectPosition && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-1.5 text-center font-mono text-slate-700 border-r border-slate-200">
                    {sub.subjectPosition ? `#${sub.subjectPosition}` : "—"}
                  </td>
                )}
                {templateConfig.showTeacherRemarks && (
                  <td className="p-1.5 sm:p-2 print:py-1.5 print:px-2 text-[11px] print:text-[10.5px] text-slate-600 italic">
                    {sub.teacherRemarks || sub.interpretation || "Satisfactory progress"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 5. CHARACTER, CONDUCT & NARRATIVE EVALUATION             */}
      {/* ======================================================== */}
      {(templateConfig.showCharacterTraits ||
        templateConfig.showClassTeacherRemarks ||
        templateConfig.showHeadmasterRemarks) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 print:gap-2.5 border border-slate-200 p-2.5 sm:p-4 print:p-2.5 rounded-xs text-xs print:text-[11px]">
          {templateConfig.showCharacterTraits && (
            <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-3">
              <span className="text-[10px] print:text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">
                Character & Demeanor
              </span>
              <div className="flex justify-between py-0.5 print:py-0.5">
                <span className="text-slate-600">Conduct:</span>
                <span className="font-bold text-slate-900">{evaluation.conductRating || "Good"}</span>
              </div>
              <div className="flex justify-between py-0.5 print:py-0.5">
                <span className="text-slate-600">Attitude to Study:</span>
                <span className="font-bold text-slate-900">{evaluation.attitudeRating || "Hardworking"}</span>
              </div>
              <div className="flex justify-between py-0.5 print:py-0.5">
                <span className="text-slate-600">Interest / Co-curricular:</span>
                <span className="font-bold text-slate-900">{evaluation.interestRating || "Active"}</span>
              </div>
            </div>
          )}

          <div
            className={`flex flex-col gap-1.5 print:gap-1.5 ${
              templateConfig.showCharacterTraits ? "md:col-span-2" : "md:col-span-3"
            }`}
          >
            {templateConfig.showClassTeacherRemarks && (
              <div>
                <span className="text-[10px] print:text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block">
                  Form Teacher Remarks
                </span>
                <p className="text-xs print:text-[10.5px] text-slate-800 italic mt-0.5 font-serif bg-slate-50 p-1.5 sm:p-2 print:p-1.5 rounded-xs border border-slate-200 leading-snug">
                  &ldquo;{evaluation.classTeacherRemarks || "A pleasant and dedicated student who has shown commendable effort throughout the term."}&rdquo;
                </p>
              </div>
            )}

            {templateConfig.showHeadmasterRemarks && (
              <div>
                <span className="text-[10px] print:text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block">
                  Headmaster / Principal Remarks
                </span>
                <p className="text-xs print:text-[10.5px] text-slate-800 italic mt-0.5 font-serif bg-slate-50 p-1.5 sm:p-2 print:p-1.5 rounded-xs border border-slate-200 leading-snug">
                  &ldquo;{evaluation.headmasterRemarks || templateConfig.customFooterNote || "Promising performance. With continuous focus and discipline, greater academic heights will be achieved."}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Institutional Notice / Footer Note */}
      {templateConfig.customFooterNote && (
        <div className="bg-slate-50 border border-slate-200 p-2 sm:p-2.5 print:p-1.5 rounded-xs text-center text-xs print:text-[10.5px] text-slate-700 italic font-serif">
          {templateConfig.customFooterNote}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. OFFICIAL SIGNATURES & VERIFICATION SEAL               */}
      {/* ======================================================== */}
      {(templateConfig.showFormTeacherSignature ||
        templateConfig.showHeadmasterSignature ||
        templateConfig.showQrVerificationSeal) && (
        <div className="grid grid-cols-3 gap-3 print:gap-3 pt-2.5 sm:pt-4 print:pt-2 border-t border-slate-300 items-end text-xs print:text-[10.5px]">
          {/* Form Teacher Signature */}
          <div className="flex flex-col items-center">
            {templateConfig.showFormTeacherSignature && (
              <>
                <div className="w-28 sm:w-36 print:w-32 border-b border-slate-500 mb-1 print:mb-1" />
                <span className="text-[10px] print:text-[9.5px] uppercase tracking-wider text-slate-500 font-bold">
                  Form Teacher Signature
                </span>
              </>
            )}
          </div>

          {/* Headmaster Signature & Stamp */}
          <div className="flex flex-col items-center">
            {templateConfig.showHeadmasterSignature && (
              <>
                {school.headmasterSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={school.headmasterSignatureUrl}
                    alt="Headmaster Signature"
                    className="h-8 sm:h-10 print:h-9 w-24 sm:w-28 print:w-28 object-contain mb-1 print:mb-1"
                  />
                ) : (
                  <div className="w-28 sm:w-36 print:w-32 border-b border-slate-500 mb-1 print:mb-1" />
                )}
                <span className="text-[10px] print:text-[9.5px] uppercase tracking-wider text-slate-500 font-bold text-center">
                  Headmaster Signature & Stamp
                </span>
              </>
            )}
          </div>

          {/* Cryptographic QR Verification Seal */}
          <div>
            {templateConfig.showQrVerificationSeal && (
              <div className="flex items-center gap-2 print:gap-2 p-1.5 sm:p-2 print:p-1.5 bg-slate-50 border border-slate-300 rounded-xs">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 print:w-11 print:h-11 flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: verification.qrSvg }}
                />
                <div className="flex flex-col">
                  <span className="text-[9px] print:text-[8px] uppercase font-bold tracking-wider text-slate-500 leading-tight">
                    Scan to Verify Authenticity
                  </span>
                  <span className="text-[10px] print:text-[9px] font-mono text-slate-700 truncate max-w-[120px] print:max-w-[110px]">
                    Token: {verification.token.slice(0, 10)}...
                  </span>
                  {!isDesignPreview && (
                    <Link
                      href={verification.verifyUrl}
                      className="text-[9px] text-primary underline font-medium mt-0.5 print:hidden"
                    >
                      Verify online &rarr;
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
