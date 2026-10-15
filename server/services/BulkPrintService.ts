import JSZip from "jszip"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { ReportService, ReportCardData } from "./ReportService"
import { ReportTemplateService, ReportTemplateConfig } from "./ReportTemplateService"

export interface BulkPrintZipResult {
  buffer: Buffer
  filename: string
  totalStudents: number
  className: string
  termName: string
}

export class BulkPrintService {
  /**
   * Generates a complete offline bulk printing ZIP package for a given class and term.
   */
  static async generateBulkPrintZip(
    termId: string,
    classId: string,
    actorUserId?: string
  ): Promise<BulkPrintZipResult> {
    const [term, targetClass, templateConfig] = await Promise.all([
      prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true },
      }),
      prisma.class.findUnique({
        where: { id: classId },
      }),
      ReportTemplateService.getTemplateConfig(),
    ])

    if (!term) throw new AppError("NOT_FOUND", "Academic term not found.", 404)
    if (!targetClass) throw new AppError("NOT_FOUND", "Class not found.", 404)

    // Retrieve all finalized or published term results for this cohort
    const termResults = await prisma.termResult.findMany({
      where: {
        termId,
        enrollment: { classId },
        status: { in: ["FINALIZED", "PUBLISHED"] },
      },
      include: {
        enrollment: {
          include: { student: true },
        },
      },
      orderBy: [{ classPosition: "asc" }, { enrollment: { student: { lastName: "asc" } } }],
    })

    if (termResults.length === 0) {
      throw new AppError(
        "NOT_FOUND",
        `No finalized report cards found for class ${targetClass.name} in ${term.name}. Ensure marks are finalized first.`,
        404
      )
    }

    // Assemble report card data models for each student
    const reportCards: Array<{ data: ReportCardData; studentIdNumber: string; studentName: string }> = []

    for (const result of termResults) {
      const data = await ReportService.generateReportCardData(result.id, undefined, actorUserId)
      reportCards.push({
        data,
        studentIdNumber: result.enrollment.student.studentIdNumber,
        studentName: `${result.enrollment.student.lastName}_${result.enrollment.student.firstName}`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        ),
      })
    }

    const zip = new JSZip()

    // 1. Generate Combined Multi-Page HTML Document (ALL_REPORTS_COMBINED.html)
    const combinedBodyHtml = reportCards
      .map(({ data }, index) => {
        const cardHtml = this.renderReportCardHtml(data, templateConfig)
        const isLast = index === reportCards.length - 1
        return `
          <div class="report-sheet-container">
            ${cardHtml}
          </div>
          ${!isLast ? '<div class="print-page-break"></div>' : ""}
        `
      })
      .join("\n")

    const fullCombinedHtml = this.wrapInStandaloneHtmlDocument({
      title: `${targetClass.name} - All Report Cards (${term.name})`,
      bodyContent: combinedBodyHtml,
      templateConfig,
      totalCount: reportCards.length,
    })

    zip.file("ALL_REPORTS_COMBINED.html", fullCombinedHtml)

    // 2. Generate Individual HTML files in reports/ folder
    const reportsFolder = zip.folder("individual_reports")
    if (reportsFolder) {
      for (const card of reportCards) {
        const singleCardHtml = this.renderReportCardHtml(card.data, templateConfig)
        const singleHtml = this.wrapInStandaloneHtmlDocument({
          title: `Report Card - ${card.studentName} (${card.studentIdNumber})`,
          bodyContent: `<div class="report-sheet-container">${singleCardHtml}</div>`,
          templateConfig,
          totalCount: 1,
        })
        reportsFolder.file(`${card.studentIdNumber}_${card.studentName}.html`, singleHtml)
      }
    }

    // 3. Generate Windows Batch Print Launcher (print_all_windows.bat)
    const batContent = `@echo off
chcp 65001 >nul
cls
echo =====================================================================
echo    OFFICIAL TERMINAL REPORT CARDS - BULK PRINT LAUNCHER
echo =====================================================================
echo.
echo   Class:            ${targetClass.name} (${targetClass.gradeLevel})
echo   Academic Session: ${term.name} - ${term.academicYear.name}
echo   Total Students:   ${reportCards.length}
echo.
echo   Opening all report cards in your default web browser...
echo.
echo   [INSTRUCTIONS]
echo   1. When the browser opens, press Ctrl + P (or right-click -> Print).
echo   2. Destination: Choose your physical printer OR "Save as PDF".
echo   3. Layout: Portrait
echo   4. Margins: Default (or None)
echo   5. Options: Check "Background graphics" to print colored headers.
echo.
echo   Each student's report card will automatically print on its own page!
echo =====================================================================
start "" "%~dp0ALL_REPORTS_COMBINED.html"
exit /b 0
`
    zip.file("print_all_windows.bat", batContent)

    // 4. Generate Edge Silent/Kiosk Direct Print Launcher (print_silent_edge.bat)
    const silentBatContent = `@echo off
chcp 65001 >nul
cls
echo =====================================================================
echo    MICROSOFT EDGE DIRECT PRINT LAUNCHER
echo =====================================================================
echo.
echo   Launching Microsoft Edge in printing mode for ${reportCards.length} report cards...
echo.
start msedge.exe --kiosk-printing "%~dp0ALL_REPORTS_COMBINED.html"
exit /b 0
`
    zip.file("print_silent_edge.bat", silentBatContent)

    // 5. Generate README.txt
    const readmeContent = `=====================================================================
OFFICIAL TERMINAL REPORT CARDS - BULK PRINTING PACKAGE
=====================================================================

School:           ${reportCards[0]?.data.school.name || "School"}
Class:            ${targetClass.name} (${targetClass.gradeLevel})
Academic Session: ${term.name} — ${term.academicYear.name}
Total Students:   ${reportCards.length}
Generated On:     ${new Date().toLocaleString()}

---------------------------------------------------------------------
QUICK START PRINTING INSTRUCTIONS
---------------------------------------------------------------------

FOR WINDOWS USERS:
1. Double-click "print_all_windows.bat".
2. The complete report card bundle will open in your default browser.
3. Press Ctrl + P (or right-click anywhere and click "Print").
4. In the print dialog:
   - Destination: Select your printer OR "Save as PDF"
   - Pages: All
   - Layout: Portrait
   - More settings -> Check "Background graphics" (Important for colors)
   - More settings -> Margins: "Default" or "None"
5. Click "Print". Each student's report card automatically prints on
   its own separate A4 page!

FOR MAC OR LINUX USERS:
1. Double-click "ALL_REPORTS_COMBINED.html" to open in Safari, Chrome, or Firefox.
2. Press Cmd + P to open the Print dialog.
3. Check "Print backgrounds" and click Print.

FOR INDIVIDUAL REPRINTS:
- Open the "individual_reports" folder to find and print any student's
  specific report card without having to re-open the combined file.

---------------------------------------------------------------------
OFFLINE GUARANTEE:
All graphics, school crests, and cryptographic QR verification seals
are embedded directly inside the files. You do NOT need an active
internet connection to print these report cards.
=====================================================================
`
    zip.file("README.txt", readmeContent)

    // Generate in-memory buffer
    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    const sanitizedClass = targetClass.name.replace(/[^a-zA-Z0-9_-]/g, "_")
    const sanitizedTerm = term.name.replace(/[^a-zA-Z0-9_-]/g, "_")
    const filename = `ReportCards_${sanitizedClass}_${sanitizedTerm}.zip`

    return {
      buffer,
      filename,
      totalStudents: reportCards.length,
      className: targetClass.name,
      termName: term.name,
    }
  }

  /**
   * Pure HTML generator rendering ReportCardData with ReportTemplateConfig
   * (Zero dependencies on react-dom/server; 100% Turbopack/Next.js safe).
   */
  private static renderReportCardHtml(
    data: ReportCardData,
    config: ReportTemplateConfig
  ): string {
    const { school, student, class: targetClass, academicSession, performance, subjects, evaluation, verification } = data

    // Color theme styling
    const colorMap: Record<string, { badge: string; perf: string; tblHeader: string; border: string; avg: string; gpa: string }> = {
      slate: { badge: "bg-slate-900 text-white", perf: "bg-slate-900 text-white", tblHeader: "bg-slate-100 text-slate-800 border-slate-300", border: "border-slate-800", avg: "text-emerald-400", gpa: "text-amber-400" },
      navy: { badge: "bg-blue-950 text-white", perf: "bg-blue-950 text-white", tblHeader: "bg-blue-50 text-blue-950 border-blue-200", border: "border-blue-900", avg: "text-cyan-300", gpa: "text-amber-300" },
      emerald: { badge: "bg-emerald-900 text-white", perf: "bg-emerald-950 text-white", tblHeader: "bg-emerald-50 text-emerald-950 border-emerald-200", border: "border-emerald-800", avg: "text-emerald-300", gpa: "text-amber-300" },
      burgundy: { badge: "bg-rose-950 text-white", perf: "bg-rose-950 text-white", tblHeader: "bg-rose-50 text-rose-950 border-rose-200", border: "border-rose-900", avg: "text-pink-300", gpa: "text-amber-300" },
      indigo: { badge: "bg-indigo-950 text-white", perf: "bg-indigo-950 text-white", tblHeader: "bg-indigo-50 text-indigo-950 border-indigo-200", border: "border-indigo-900", avg: "text-indigo-300", gpa: "text-amber-300" },
      amber: { badge: "bg-amber-950 text-white", perf: "bg-amber-950 text-white", tblHeader: "bg-amber-50 text-amber-950 border-amber-200", border: "border-amber-800", avg: "text-yellow-300", gpa: "text-lime-300" },
    }

    const theme = colorMap[config.accentColor] || colorMap.slate

    const schoolIconSvg = `<svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
    const userIconSvg = `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`

    // Header HTML based on layout
    let headerHtml = ""
    if (config.headerLayout === "CLASSIC_CENTERED") {
      headerHtml = `
        <div class="flex flex-row items-center justify-between border-b-2 ${theme.border} pb-5 gap-4">
          ${config.showSchoolCrest ? `
            <div class="h-20 w-20 flex-shrink-0 rounded-full flex items-center justify-center border-2 border-slate-300 text-slate-700 overflow-hidden bg-slate-50">
              ${school.crestUrl ? `<img src="${school.crestUrl}" alt="Crest" class="h-full w-full object-contain" />` : schoolIconSvg}
            </div>` : ""}
          <div class="flex-1 text-center">
            <h1 class="text-2xl font-black uppercase tracking-wider text-slate-900">${school.name}</h1>
            ${config.showSchoolMotto && school.motto ? `<p class="text-xs italic text-slate-600 font-serif mt-0.5">&ldquo;${school.motto}&rdquo;</p>` : ""}
            ${config.showContactDetails ? `<p class="text-xs text-slate-600 mt-1">${school.postalAddress} | Phone: ${school.phone} | Email: ${school.email}</p>` : ""}
            <div class="inline-block mt-2 px-3 py-0.5 ${theme.badge} text-[11px] font-bold uppercase tracking-widest rounded-xs">
              ${config.reportTitle || "Official Terminal Academic Report"}
            </div>
          </div>
          ${config.showSchoolCode ? `
            <div class="h-20 w-20 flex-shrink-0 flex flex-col items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded text-center">
              <span class="text-[9px] uppercase tracking-wider font-bold text-slate-500">School Code</span>
              <span class="text-xs font-mono font-black text-slate-800 mt-0.5">${school.code}</span>
            </div>` : ""}
        </div>
      `
    } else if (config.headerLayout === "MODERN_SPLIT") {
      headerHtml = `
        <div class="flex flex-row items-center justify-between border-b-2 ${theme.border} pb-5 gap-6">
          <div class="flex items-center gap-4 flex-1">
            ${config.showSchoolCrest ? `
              <div class="h-20 w-20 flex-shrink-0 rounded-xl flex items-center justify-center border border-slate-300 text-slate-700 overflow-hidden bg-slate-50">
                ${school.crestUrl ? `<img src="${school.crestUrl}" alt="Crest" class="h-full w-full object-contain" />` : schoolIconSvg}
              </div>` : ""}
            <div>
              <h1 class="text-2xl font-black uppercase tracking-tight text-slate-900">${school.name}</h1>
              ${config.showSchoolMotto && school.motto ? `<p class="text-xs italic text-slate-600 font-serif">&ldquo;${school.motto}&rdquo;</p>` : ""}
              ${config.showContactDetails ? `<p class="text-[11px] text-slate-500 mt-1">${school.postalAddress} • ${school.phone}</p>` : ""}
            </div>
          </div>
          <div class="flex flex-col items-end">
            <div class="px-3 py-1 ${theme.badge} text-xs font-bold uppercase tracking-wider rounded-xs mb-1.5">
              ${config.reportTitle || "Terminal Academic Report"}
            </div>
            ${config.showSchoolCode ? `<span class="text-xs font-mono font-semibold text-slate-600">Code: ${school.code}</span>` : ""}
          </div>
        </div>
      `
    } else {
      headerHtml = `
        <div class="flex flex-col border-b-2 ${theme.border} pb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              ${config.showSchoolCrest ? `
                <div class="h-14 w-14 rounded-lg flex items-center justify-center border border-slate-300 text-slate-700 bg-slate-50">
                  ${school.crestUrl ? `<img src="${school.crestUrl}" alt="Crest" class="h-full w-full object-contain" />` : schoolIconSvg}
                </div>` : ""}
              <div>
                <h1 class="text-xl font-black uppercase text-slate-900 tracking-wide">${school.name}</h1>
                ${config.showSchoolMotto && school.motto ? `<p class="text-[11px] italic text-slate-500 font-serif">${school.motto}</p>` : ""}
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-bold uppercase px-2.5 py-1 ${theme.badge} rounded-xs inline-block">
                ${config.reportTitle || "Official Report"}
              </span>
              ${config.showSchoolCode ? `<p class="text-[11px] font-mono text-slate-600 mt-1">${school.code}</p>` : ""}
            </div>
          </div>
          ${config.showContactDetails ? `
            <p class="text-[10px] text-slate-500 mt-2 text-center border-t border-slate-100 pt-1">
              ${school.postalAddress} | Phone: ${school.phone} | Email: ${school.email}
            </p>` : ""}
        </div>
      `
    }

    // Student & Academic Info Box
    const studentInfoHtml = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xs text-xs">
        <div class="flex items-center gap-3" style="grid-column: span 2;">
          ${config.showStudentPhoto ? `
            <div class="h-12 w-12 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0 text-slate-500 overflow-hidden">
              ${student.photoUrl ? `<img src="${student.photoUrl}" alt="${student.fullName}" class="h-full w-full object-cover" />` : userIconSvg}
            </div>` : ""}
          <div>
            <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Student Full Name</span>
            <span class="font-bold text-slate-900 text-sm">${student.fullName}</span>
          </div>
        </div>

        <div>
          <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Student ID Number</span>
          <span class="font-mono font-bold text-slate-900">${student.idNumber}</span>
        </div>

        <div>
          <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Class & Grade Level</span>
          <span class="font-bold text-slate-900">${targetClass.name} (${targetClass.gradeLevel})</span>
        </div>

        ${config.showGender ? `
          <div class="mt-1">
            <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Gender ${config.showRollNumber && student.rollNumber ? "/ Roll No" : ""}
            </span>
            <span class="font-semibold text-slate-800">
              ${student.gender} ${config.showRollNumber && student.rollNumber ? `/ #${student.rollNumber}` : ""}
            </span>
          </div>` : ""}

        ${config.showDateOfBirth ? `
          <div class="mt-1">
            <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Date of Birth</span>
            <span class="font-semibold text-slate-800">
              ${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "Not Specified"}
            </span>
          </div>` : ""}

        <div class="mt-1">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Academic Session</span>
          <span class="font-bold text-slate-900">${academicSession.academicYear} — ${academicSession.termName}</span>
        </div>

        ${config.showNextTermResumption ? `
          <div class="mt-1">
            <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Term Resumption</span>
            <span class="font-semibold text-slate-800">
              ${academicSession.nextTermResumption ? new Date(academicSession.nextTermResumption).toLocaleDateString() : "To Be Announced"}
            </span>
          </div>` : ""}

        ${config.showAttendanceMetrics ? `
          <div class="mt-1">
            <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Term Attendance</span>
            <span class="font-semibold text-slate-800">
              ${evaluation.daysPresent} / ${evaluation.totalSchoolDays} days (${evaluation.attendancePercentage}%)
            </span>
          </div>` : ""}

        <div class="mt-1">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Report Status</span>
          <span class="font-mono font-bold text-emerald-700 uppercase">${performance.status}</span>
        </div>
      </div>
    `

    // Performance Strip
    const activeMetricsCount = [config.showClassPosition, config.showOverallTotal, config.showTermAverage, config.showTermGpa].filter(Boolean).length
    let perfStripHtml = ""
    if (activeMetricsCount > 0) {
      perfStripHtml = `
        <div class="${theme.perf} p-3 rounded-xs text-center" style="display: grid; grid-template-columns: repeat(${activeMetricsCount}, minmax(0, 1fr)); gap: 8px;">
          ${config.showClassPosition ? `
            <div>
              <span class="text-[9px] uppercase tracking-wider font-bold text-slate-300 block">Class Position</span>
              <span class="text-xl font-black font-mono">#${performance.classPosition} <span class="text-xs font-normal text-slate-400">/ ${performance.cohortSize}</span></span>
            </div>` : ""}
          ${config.showOverallTotal ? `
            <div>
              <span class="text-[9px] uppercase tracking-wider font-bold text-slate-300 block">Overall Total</span>
              <span class="text-xl font-black font-mono">${performance.totalScore.toFixed(1)}</span>
            </div>` : ""}
          ${config.showTermAverage ? `
            <div>
              <span class="text-[9px] uppercase tracking-wider font-bold text-slate-300 block">Term Average</span>
              <span class="text-xl font-black font-mono ${theme.avg}">${performance.averageScore.toFixed(1)}%</span>
            </div>` : ""}
          ${config.showTermGpa ? `
            <div>
              <span class="text-[9px] uppercase tracking-wider font-bold text-slate-300 block">Term GPA</span>
              <span class="text-xl font-black font-mono ${theme.gpa}">${performance.gpa !== null ? performance.gpa.toFixed(2) : "—"}</span>
            </div>` : ""}
        </div>
      `
    }

    // Subjects Table
    const tableRows = subjects
      .map((sub, idx) => `
        <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
          <td class="p-2 font-semibold border-r border-slate-200">
            ${sub.subjectName} <span class="text-[10px] text-slate-500 font-mono">(${sub.subjectCode})</span>
          </td>
          ${config.showCaScore ? `<td class="p-2 text-center font-mono border-r border-slate-200">${sub.caWeightedScore.toFixed(1)}</td>` : ""}
          ${config.showExamScore ? `<td class="p-2 text-center font-mono border-r border-slate-200">${sub.examWeightedScore.toFixed(1)}</td>` : ""}
          ${config.showTotalScore ? `<td class="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-200">${sub.totalScore.toFixed(1)}</td>` : ""}
          ${config.showGrade ? `<td class="p-2 text-center font-bold font-mono border-r border-slate-200">${sub.grade}</td>` : ""}
          ${config.showGradeInterpretation ? `<td class="p-2 text-center text-[11px] text-slate-700 border-r border-slate-200">${sub.interpretation || "—"}</td>` : ""}
          ${config.showSubjectPosition ? `<td class="p-2 text-center font-mono text-slate-700 border-r border-slate-200">${sub.subjectPosition ? `#${sub.subjectPosition}` : "—"}</td>` : ""}
          ${config.showTeacherRemarks ? `<td class="p-2 text-[11px] text-slate-600 italic">${sub.teacherRemarks || sub.interpretation || "Satisfactory progress"}</td>` : ""}
        </tr>
      `)
      .join("\n")

    const tableHtml = `
      <div class="border border-slate-300 rounded-xs overflow-hidden">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="${theme.tblHeader} border-b text-[11px] font-bold uppercase tracking-wider">
              <th class="p-2 border-r border-slate-300">Subject</th>
              ${config.showCaScore ? '<th class="p-2 text-center border-r border-slate-300" style="width: 64px;">CA (30)</th>' : ""}
              ${config.showExamScore ? '<th class="p-2 text-center border-r border-slate-300" style="width: 64px;">Exam (70)</th>' : ""}
              ${config.showTotalScore ? '<th class="p-2 text-center border-r border-slate-300" style="width: 80px;">Total (100)</th>' : ""}
              ${config.showGrade ? '<th class="p-2 text-center border-r border-slate-300" style="width: 56px;">Grade</th>' : ""}
              ${config.showGradeInterpretation ? '<th class="p-2 text-center border-r border-slate-300" style="width: 96px;">Interpretation</th>' : ""}
              ${config.showSubjectPosition ? '<th class="p-2 text-center border-r border-slate-300" style="width: 64px;">Rank</th>' : ""}
              ${config.showTeacherRemarks ? '<th class="p-2" style="min-width: 144px;">Remarks</th>' : ""}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${tableRows}
          </tbody>
        </table>
      </div>
    `

    // Conduct & Remarks
    let remarksHtml = ""
    if (config.showCharacterTraits || config.showClassTeacherRemarks || config.showHeadmasterRemarks) {
      remarksHtml = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 border border-slate-200 p-4 rounded-xs text-xs">
          ${config.showCharacterTraits ? `
            <div class="flex flex-col gap-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
              <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Character & Demeanor</span>
              <div class="flex justify-between py-0.5"><span class="text-slate-600">Conduct:</span><span class="font-bold text-slate-900">${evaluation.conductRating || "Good"}</span></div>
              <div class="flex justify-between py-0.5"><span class="text-slate-600">Attitude to Study:</span><span class="font-bold text-slate-900">${evaluation.attitudeRating || "Hardworking"}</span></div>
              <div class="flex justify-between py-0.5"><span class="text-slate-600">Interest / Co-curricular:</span><span class="font-bold text-slate-900">${evaluation.interestRating || "Active"}</span></div>
            </div>` : ""}
          <div class="flex flex-col gap-2 ${config.showCharacterTraits ? "" : "col-span-3"}" style="${config.showCharacterTraits ? "grid-column: span 2;" : ""}">
            ${config.showClassTeacherRemarks ? `
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Form Teacher Remarks</span>
                <p class="text-xs text-slate-800 italic mt-0.5 font-serif bg-slate-50 p-2 rounded-xs border border-slate-200">
                  &ldquo;${evaluation.classTeacherRemarks || "A pleasant and dedicated student who has shown commendable effort throughout the term."}&rdquo;
                </p>
              </div>` : ""}
            ${config.showHeadmasterRemarks ? `
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Headmaster / Principal Remarks</span>
                <p class="text-xs text-slate-800 italic mt-0.5 font-serif bg-slate-50 p-2 rounded-xs border border-slate-200">
                  &ldquo;${evaluation.headmasterRemarks || config.customFooterNote || "Promising performance. With continuous focus and discipline, greater academic heights will be achieved."}&rdquo;
                </p>
              </div>` : ""}
          </div>
        </div>
      `
    }

    // Custom Footer Note
    let footerNoteHtml = ""
    if (config.customFooterNote) {
      footerNoteHtml = `
        <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xs text-center text-xs text-slate-700 italic font-serif">
          ${config.customFooterNote}
        </div>
      `
    }

    // Signatures & Verification Seal
    let signaturesHtml = ""
    if (config.showFormTeacherSignature || config.showHeadmasterSignature || config.showQrVerificationSeal) {
      signaturesHtml = `
        <div class="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300 items-end text-xs">
          <div class="flex flex-col items-center">
            ${config.showFormTeacherSignature ? `
              <div class="w-36 border-b border-slate-500 mb-1"></div>
              <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Form Teacher Signature</span>
            ` : ""}
          </div>

          <div class="flex flex-col items-center">
            ${config.showHeadmasterSignature ? `
              ${school.headmasterSignatureUrl ? `<img src="${school.headmasterSignatureUrl}" alt="Signature" class="h-10 w-28 object-contain mb-1" />` : '<div class="w-36 border-b border-slate-500 mb-1"></div>'}
              <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold text-center">Headmaster Signature & Stamp</span>
            ` : ""}
          </div>

          <div>
            ${config.showQrVerificationSeal ? `
              <div class="flex items-center gap-3 p-2 bg-slate-50 border border-slate-300 rounded-xs">
                <div class="w-16 h-16 flex-shrink-0">
                  ${verification.qrSvg}
                </div>
                <div class="flex flex-col">
                  <span class="text-[9px] uppercase font-bold tracking-wider text-slate-500">Scan to Verify Authenticity</span>
                  <span class="text-[10px] font-mono text-slate-700 truncate" style="max-width: 130px;">Token: ${verification.token.slice(0, 12)}...</span>
                </div>
              </div>
            ` : ""}
          </div>
        </div>
      `
    }

    return `
      <div class="report-sheet-container a4-report-sheet w-full max-w-4xl bg-white text-slate-900 border border-slate-300 p-6 flex flex-col gap-3 font-sans mx-auto">
        ${headerHtml}
        ${studentInfoHtml}
        ${perfStripHtml}
        ${tableHtml}
        ${remarksHtml}
        ${footerNoteHtml}
        ${signaturesHtml}
      </div>
    `
  }

  /**
   * Helper that wraps static markup in a standalone, self-contained HTML5 document
   * with complete inlined typography, flex/grid rules, and CSS paged media.
   */
  private static wrapInStandaloneHtmlDocument(params: {
    title: string
    bodyContent: string
    templateConfig: ReportTemplateConfig
    totalCount: number
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    /* Reset & Base System Typography */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    /* Print Screen Toolbar */
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .print-toolbar h1 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .print-toolbar p {
      font-size: 12px;
      color: #94a3b8;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }

    /* Document Sheet Wrapper */
    .report-sheet-container {
      max-width: 860px;
      margin: 24px auto;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid #cbd5e1;
      padding: 36px 44px;
    }

    /* Standardized Grid and Flex Utility Replacements for Offline Self-Containment */
    .flex { display: flex; }
    .flex-row { flex-direction: row; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .flex-1 { flex: 1 1 0%; }
    .flex-shrink-0 { flex-shrink: 0; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    @media (min-width: 640px) {
      .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (min-width: 768px) {
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    .gap-1 { gap: 4px; }
    .gap-1\\.5 { gap: 6px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .gap-6 { gap: 24px; }
    .gap-8 { gap: 32px; }
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .w-10 { width: 40px; }
    .h-10 { height: 40px; }
    .w-12 { width: 48px; }
    .h-12 { height: 48px; }
    .w-14 { width: 56px; }
    .h-14 { height: 56px; }
    .w-16 { width: 64px; }
    .h-16 { height: 64px; }
    .w-20 { width: 80px; }
    .h-20 { height: 80px; }
    .w-28 { width: 112px; }
    .w-36 { width: 144px; }
    .overflow-hidden { overflow: hidden; }
    .rounded { border-radius: 4px; }
    .rounded-xs { border-radius: 2px; }
    .rounded-md { border-radius: 6px; }
    .rounded-lg { border-radius: 8px; }
    .rounded-xl { border-radius: 12px; }
    .rounded-full { border-radius: 9999px; }

    /* Typography */
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .font-serif { font-family: Georgia, Cambria, "Times New Roman", Times, serif; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-xs { font-size: 12px; line-height: 16px; }
    .text-\\[9px\\] { font-size: 9px; line-height: 12px; }
    .text-\\[10px\\] { font-size: 10px; line-height: 14px; }
    .text-\\[11px\\] { font-size: 11px; line-height: 15px; }
    .text-sm { font-size: 14px; line-height: 20px; }
    .text-xl { font-size: 20px; line-height: 28px; }
    .text-2xl { font-size: 24px; line-height: 32px; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .italic { font-style: italic; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Colors */
    .bg-white { background-color: #ffffff; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-slate-200 { background-color: #e2e8f0; }
    .bg-slate-900 { background-color: #0f172a; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-blue-950 { background-color: #172554; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-emerald-900 { background-color: #064e3b; }
    .bg-emerald-950 { background-color: #022c22; }
    .bg-rose-50 { background-color: #fff1f2; }
    .bg-rose-950 { background-color: #4c0519; }
    .bg-indigo-50 { background-color: #eef2ff; }
    .bg-indigo-950 { background-color: #1e1b4b; }
    .bg-amber-50 { background-color: #fffbeb; }
    .bg-amber-950 { background-color: #451a03; }

    .text-white { color: #ffffff; }
    .text-slate-900 { color: #0f172a; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-700 { color: #334155; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-300 { color: #cbd5e1; }
    .text-blue-950 { color: #172554; }
    .text-emerald-950 { color: #022c22; }
    .text-rose-950 { color: #4c0519; }
    .text-indigo-950 { color: #1e1b4b; }
    .text-amber-950 { color: #451a03; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-400 { color: #34d399; }
    .text-emerald-300 { color: #6ee7b7; }
    .text-amber-400 { color: #fbbf24; }
    .text-amber-300 { color: #fcd34d; }
    .text-cyan-300 { color: #67e8f9; }
    .text-pink-300 { color: #f472b6; }
    .text-indigo-300 { color: #a5b4fc; }
    .text-yellow-300 { color: #fde047; }
    .text-lime-300 { color: #bef264; }

    /* Borders */
    .border { border: 1px solid #cbd5e1; }
    .border-b { border-bottom: 1px solid #cbd5e1; }
    .border-b-2 { border-bottom: 2px solid #0f172a; }
    .border-t { border-top: 1px solid #cbd5e1; }
    .border-r { border-right: 1px solid #cbd5e1; }
    .border-collapse { border-collapse: collapse; }
    .border-slate-100 { border-color: #f1f5f9; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-slate-300 { border-color: #cbd5e1; }
    .border-slate-500 { border-color: #64748b; }
    .border-slate-800 { border-color: #1e293b; }
    .border-slate-900 { border-color: #0f172a; }
    .border-blue-200 { border-color: #bfdbfe; }
    .border-blue-900 { border-color: #1e3a8a; }
    .border-emerald-200 { border-color: #a7f3d0; }
    .border-emerald-800 { border-color: #065f46; }
    .border-rose-200 { border-color: #fecdd3; }
    .border-rose-900 { border-color: #881337; }
    .border-indigo-200 { border-color: #c7d2fe; }
    .border-indigo-900 { border-color: #312e81; }
    .border-amber-200 { border-color: #fde68a; }
    .border-amber-800 { border-color: #92400e; }

    /* Spacing */
    .p-1 { padding: 4px; }
    .p-2 { padding: 8px; }
    .p-2\\.5 { padding: 10px; }
    .p-3 { padding: 12px; }
    .p-4 { padding: 16px; }
    .p-8 { padding: 32px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .pb-3 { padding-bottom: 12px; }
    .pb-4 { padding-bottom: 16px; }
    .pb-5 { padding-bottom: 20px; }
    .pt-1 { padding-top: 4px; }
    .pt-2 { padding-top: 8px; }
    .pt-4 { padding-top: 16px; }
    .mt-0\\.5 { margin-top: 2px; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-1\\.5 { margin-bottom: 6px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; font-size: 11px; }
    tbody tr:nth-child(even) { background-color: #f8fafc; }

    /* Page Breaks for Multi-Page Printing */
    .print-page-break {
      display: block;
      height: 1px;
      page-break-after: always;
      break-after: page;
    }

    /* Print Media Styles */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .report-sheet-container {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 auto !important;
        max-width: 100% !important;
        height: 275mm !important;
        min-height: 275mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .print-page-break {
        page-break-after: always !important;
        break-after: page !important;
        height: 0 !important;
      }
      .print\\:hidden {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Floating Action Bar for Web View (Hidden when printed) -->
  <div class="print-toolbar">
    <div>
      <h1>${params.title}</h1>
      <p>${params.totalCount} student report card${params.totalCount !== 1 ? "s" : ""} compiled & ready to print</p>
    </div>
    <button class="print-btn" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Print All Reports (Ctrl+P)
    </button>
  </div>

  ${params.bodyContent}
</body>
</html>`
  }
}
