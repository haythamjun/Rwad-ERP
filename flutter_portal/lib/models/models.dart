// ── Student ────────────────────────────────────────────────────────────────────

class StudentModel {
  final int    id;
  final String fileNumber;
  final String fullName;
  final String nationalId;
  final String dateOfBirth;
  final int    age;
  final String gender;
  final String genderDisplay;
  final String status;
  final String statusDisplay;
  final String? disabilityDisplay;
  final String? disabilityDegree;
  final String? branchName;
  final String  registrationDate;
  final String? photo;

  const StudentModel({
    required this.id,
    required this.fileNumber,
    required this.fullName,
    required this.nationalId,
    required this.dateOfBirth,
    required this.age,
    required this.gender,
    required this.genderDisplay,
    required this.status,
    required this.statusDisplay,
    this.disabilityDisplay,
    this.disabilityDegree,
    this.branchName,
    required this.registrationDate,
    this.photo,
  });

  factory StudentModel.fromJson(Map<String, dynamic> j) => StudentModel(
        id:                 j['id'] as int? ?? 0,
        fileNumber:         j['file_number']?.toString()    ?? '',
        fullName:           j['full_name']?.toString()      ?? '',
        nationalId:         j['national_id']?.toString()    ?? '',
        dateOfBirth:        j['date_of_birth']?.toString()  ?? '',
        age:                j['age'] as int?                ?? 0,
        gender:             j['gender']?.toString()         ?? '',
        genderDisplay:      j['gender_display']?.toString() ?? '',
        status:             j['status']?.toString()         ?? '',
        statusDisplay:      j['status_display']?.toString() ?? '',
        disabilityDisplay:  j['disability_display']?.toString(),
        disabilityDegree:   j['disability_degree']?.toString(),
        branchName:         j['branch_name']?.toString(),
        registrationDate:   j['registration_date']?.toString() ?? '',
        photo:              j['photo']?.toString(),
      );
}

// ── Guardian ───────────────────────────────────────────────────────────────────

class GuardianModel {
  final int    id;
  final String name;
  final String phone;
  final String relationship;

  const GuardianModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.relationship,
  });

  factory GuardianModel.fromJson(Map<String, dynamic> j) => GuardianModel(
        id:           j['id'] as int?           ?? 0,
        name:         j['name']?.toString()     ?? '',
        phone:        j['phone']?.toString()    ?? '',
        relationship: j['relationship']?.toString() ?? '',
      );
}

// ── Attendance stats ───────────────────────────────────────────────────────────

class AttendanceStats {
  final int    total;
  final int    present;
  final int    absent;
  final int    late;
  final int    excusedAbsence;
  final int    earlyLeave;
  final double attendanceRate;

  const AttendanceStats({
    required this.total,
    required this.present,
    required this.absent,
    required this.late,
    required this.excusedAbsence,
    required this.earlyLeave,
    required this.attendanceRate,
  });

  factory AttendanceStats.fromJson(Map<String, dynamic> j) => AttendanceStats(
        total:          (j['total']           as num? ?? 0).toInt(),
        present:        (j['present']         as num? ?? 0).toInt(),
        absent:         (j['absent']          as num? ?? 0).toInt(),
        late:           (j['late']            as num? ?? 0).toInt(),
        excusedAbsence: (j['excused_absence'] as num? ?? 0).toInt(),
        earlyLeave:     (j['early_leave']     as num? ?? 0).toInt(),
        attendanceRate: (j['attendance_rate'] as num? ?? 0).toDouble(),
      );

  factory AttendanceStats.empty() => const AttendanceStats(
        total: 0, present: 0, absent: 0, late: 0,
        excusedAbsence: 0, earlyLeave: 0, attendanceRate: 0,
      );
}

// ── Attendance record ──────────────────────────────────────────────────────────

class AttendanceRecord {
  final int     id;
  final String  date;
  final String  status;
  final String  statusDisplay;
  final String? checkInTime;
  final String? checkOutTime;
  final String? absenceReason;
  final bool    guardianNotified;
  final String? notes;

  const AttendanceRecord({
    required this.id,
    required this.date,
    required this.status,
    required this.statusDisplay,
    this.checkInTime,
    this.checkOutTime,
    this.absenceReason,
    required this.guardianNotified,
    this.notes,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> j) => AttendanceRecord(
        id:               j['id'] as int?                        ?? 0,
        date:             j['date']?.toString()                  ?? '',
        status:           j['status']?.toString()                ?? '',
        statusDisplay:    j['status_display']?.toString()        ?? '',
        checkInTime:      j['check_in_time']?.toString(),
        checkOutTime:     j['check_out_time']?.toString(),
        absenceReason:    j['absence_reason']?.toString(),
        guardianNotified: j['guardian_notified'] as bool?        ?? false,
        notes:            j['notes']?.toString(),
      );
}
