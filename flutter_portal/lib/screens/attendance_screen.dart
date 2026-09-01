import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/constants.dart';
import '../models/models.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  DateTime _month = DateTime.now();
  List<AttendanceRecord> _records = [];
  AttendanceStats        _stats   = AttendanceStats.empty();
  bool   _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    final monthStr = DateFormat('yyyy-MM').format(_month);
    try {
      final d = await ApiClient.get(
        '/portal/attendance/',
        params: {'month': monthStr},
      );
      final data = d as Map<String, dynamic>;
      setState(() {
        _stats   = AttendanceStats.fromJson(data['stats'] as Map<String, dynamic>);
        _records = (data['records'] as List<dynamic>)
            .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() { _error = e.message; _loading = false; });
    } catch (_) {
      setState(() { _error = 'تعذّر تحميل البيانات'; _loading = false; });
    }
  }

  void _prevMonth() {
    setState(() => _month = DateTime(_month.year, _month.month - 1));
    _load();
  }

  void _nextMonth() {
    final now = DateTime.now();
    if (_month.year == now.year && _month.month == now.month) return;
    setState(() => _month = DateTime(_month.year, _month.month + 1));
    _load();
  }

  bool get _isCurrentMonth {
    final now = DateTime.now();
    return _month.year == now.year && _month.month == now.month;
  }

  String get _monthLabel {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    return '${months[_month.month - 1]} ${_month.year}';
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: kColorBg,
        appBar: AppBar(
          title: const Text('سجل الحضور والغياب'),
        ),
        body: Column(
          children: [
            // ── Month picker ──────────────────────────────────────────────
            Container(
              color: kColorPrimary,
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_right, color: Colors.white, size: 28),
                    onPressed: _prevMonth,
                  ),
                  Text(
                    _monthLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.chevron_left,
                      size: 28,
                      color: _isCurrentMonth
                          ? Colors.white.withOpacity(0.3)
                          : Colors.white,
                    ),
                    onPressed: _isCurrentMonth ? null : _nextMonth,
                  ),
                ],
              ),
            ),

            // ── Content ───────────────────────────────────────────────────
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!, style: TextStyle(color: Colors.grey.shade500)),
                                const SizedBox(height: 16),
                                ElevatedButton(onPressed: _load, child: const Text('إعادة')),
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              _MonthSummaryCard(stats: _stats),
                              const SizedBox(height: 16),
                              if (_records.isEmpty)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 40),
                                  child: Center(
                                    child: Text(
                                      'لا توجد سجلات لهذا الشهر',
                                      style: TextStyle(color: Colors.grey.shade400),
                                    ),
                                  ),
                                )
                              else
                                ..._records.map((r) => _RecordCard(record: r)),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      );
}

// ── Month summary card ────────────────────────────────────────────────────────

class _MonthSummaryCard extends StatelessWidget {
  final AttendanceStats stats;
  const _MonthSummaryCard({required this.stats});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ملخص الشهر  •  ${stats.total} يوم',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
              const SizedBox(height: 14),

              // Rate bar
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: stats.attendanceRate / 100,
                  minHeight: 10,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    stats.attendanceRate >= 80
                        ? const Color(0xFF16A34A)
                        : const Color(0xFFD97706),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'معدل الحضور: ${stats.attendanceRate}%',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: stats.attendanceRate >= 80
                      ? const Color(0xFF16A34A)
                      : const Color(0xFFD97706),
                ),
              ),
              const SizedBox(height: 14),

              // Chips
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _Chip(label: 'حاضر',    count: stats.present,        color: const Color(0xFF16A34A)),
                  _Chip(label: 'غائب',    count: stats.absent,         color: const Color(0xFFDC2626)),
                  _Chip(label: 'متأخر',   count: stats.late,           color: const Color(0xFFD97706)),
                  _Chip(label: 'بعذر',    count: stats.excusedAbsence, color: const Color(0xFF2563EB)),
                  _Chip(label: 'مبكر',    count: stats.earlyLeave,     color: const Color(0xFFEA580C)),
                ],
              ),
            ],
          ),
        ),
      );
}

class _Chip extends StatelessWidget {
  final String label;
  final int    count;
  final Color  color;
  const _Chip({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          '$label: $count',
          style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w700),
        ),
      );
}

// ── Record card ───────────────────────────────────────────────────────────────

class _RecordCard extends StatelessWidget {
  final AttendanceRecord record;
  const _RecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
    final color = kAttendanceColors[record.status] ?? Colors.grey;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 52,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    record.date,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (record.checkInTime != null || record.checkOutTime != null)
                    Text(
                      [
                        if (record.checkInTime != null)  'حضور: ${record.checkInTime}',
                        if (record.checkOutTime != null) 'انصراف: ${record.checkOutTime}',
                      ].join('  •  '),
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  if (record.absenceReason != null && record.absenceReason!.isNotEmpty)
                    Text(
                      'السبب: ${record.absenceReason}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                record.statusDisplay,
                style: TextStyle(
                  fontSize: 12,
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
