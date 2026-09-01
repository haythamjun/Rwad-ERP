import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/constants.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../widgets/status_badge.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  bool   _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final d = await ApiClient.get('/portal/dashboard/');
      setState(() { _data = d as Map<String, dynamic>; _loading = false; });
    } on ApiException catch (e) {
      setState(() { _error = e.message; _loading = false; });
    } catch (_) {
      setState(() { _error = 'تعذّر تحميل البيانات'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final guardian = context.read<AuthProvider>().guardian;

    return Scaffold(
      backgroundColor: kColorBg,
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            // ── App bar ──────────────────────────────────────────────────
            SliverAppBar(
              expandedHeight: 120,
              pinned: true,
              backgroundColor: kColorPrimary,
              flexibleSpace: FlexibleSpaceBar(
                background: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 56, 20, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        'مرحباً، ${guardian?.name ?? ''}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'مركز رؤية للتأهيل',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.65),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  onPressed: _load,
                ),
              ],
            ),

            // ── Body ─────────────────────────────────────────────────────
            if (_loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.wifi_off_rounded, size: 56, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade500),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton(
                          onPressed: _load,
                          child: const Text('إعادة المحاولة'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              _DashboardBody(data: _data!),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _DashboardBody extends StatelessWidget {
  final Map<String, dynamic> data;
  const _DashboardBody({required this.data});

  @override
  Widget build(BuildContext context) {
    final student = StudentModel.fromJson(data['student'] as Map<String, dynamic>);
    final stats   = AttendanceStats.fromJson(data['stats'] as Map<String, dynamic>);
    final recent  = (data['recent_attendance'] as List<dynamic>)
        .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
        .toList();

    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverList(
        delegate: SliverChildListDelegate([
          _StudentCard(student: student),
          const SizedBox(height: 20),
          const _SectionTitle('إحصائيات الحضور'),
          const SizedBox(height: 10),
          _StatsPanel(stats: stats),
          const SizedBox(height: 20),
          const _SectionTitle('آخر السجلات'),
          const SizedBox(height: 10),
          if (recent.isEmpty)
            _EmptyHint('لا توجد سجلات حضور بعد')
          else
            ...recent.map((r) => _AttendanceRow(record: r)),
          const SizedBox(height: 20),
        ]),
      ),
    );
  }
}

// ── Student card ──────────────────────────────────────────────────────────────

class _StudentCard extends StatelessWidget {
  final StudentModel student;
  const _StudentCard({required this.student});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: kColorPrimary.withOpacity(0.1),
                child: Text(
                  student.fullName.isNotEmpty ? student.fullName[0] : '؟',
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: kColorPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.fullName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Text(
                          student.fileNumber,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(
                          status: student.status,
                          label: student.statusDisplay,
                        ),
                      ],
                    ),
                    if (student.branchName != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined,
                              size: 13, color: Colors.grey.shade400),
                          const SizedBox(width: 2),
                          Text(
                            student.branchName!,
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

// ── Stats panel ───────────────────────────────────────────────────────────────

class _StatsPanel extends StatelessWidget {
  final AttendanceStats stats;
  const _StatsPanel({required this.stats});

  @override
  Widget build(BuildContext context) => Column(
        children: [
          // Rate card
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                children: [
                  const Icon(Icons.show_chart_rounded, color: Colors.green, size: 32),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'معدل الحضور الكلي',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      Text(
                        '${stats.attendanceRate}%',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    '${stats.total} يوم',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Counts row
          Row(
            children: [
              Expanded(
                child: _CountTile(
                  label: 'حاضر',
                  count: stats.present,
                  color: const Color(0xFF16A34A),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _CountTile(
                  label: 'غائب',
                  count: stats.absent,
                  color: const Color(0xFFDC2626),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _CountTile(
                  label: 'متأخر',
                  count: stats.late,
                  color: const Color(0xFFD97706),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _CountTile(
                  label: 'مبكر',
                  count: stats.earlyLeave,
                  color: const Color(0xFFEA580C),
                ),
              ),
            ],
          ),
        ],
      );
}

class _CountTile extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _CountTile({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
          child: Column(
            children: [
              Text(
                '$count',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
      );
}

// ── Attendance row ────────────────────────────────────────────────────────────

class _AttendanceRow extends StatelessWidget {
  final AttendanceRecord record;
  const _AttendanceRow({required this.record});

  @override
  Widget build(BuildContext context) {
    final color = kAttendanceColors[record.status] ?? Colors.grey;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 42,
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
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (record.checkInTime != null)
                    Text(
                      'وقت الحضور: ${record.checkInTime}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
      );
}

class _EmptyHint extends StatelessWidget {
  final String message;
  const _EmptyHint(this.message);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 28),
        child: Center(
          child: Text(message, style: TextStyle(color: Colors.grey.shade400)),
        ),
      );
}
