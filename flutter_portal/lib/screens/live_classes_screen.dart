import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api.dart';
import '../core/constants.dart';
import '../models/models.dart';

const Color _kLive = Color(0xFFDC2626);

class LiveClassesScreen extends StatefulWidget {
  const LiveClassesScreen({super.key});

  @override
  State<LiveClassesScreen> createState() => _LiveClassesScreenState();
}

class _LiveClassesScreenState extends State<LiveClassesScreen> {
  List<VirtualSessionModel> _live     = [];
  List<VirtualSessionModel> _upcoming = [];
  bool    _hasClassroom = true;
  bool    _loading = true;
  String? _error;
  int?    _joiningId;
  Timer?  _timer;

  @override
  void initState() {
    super.initState();
    _load();
    // الحصة القادمة تتحول "مباشرة" بدون ما يسحب ولي الأمر للتحديث
    _timer = Timer.periodic(const Duration(seconds: 60), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() { _loading = true; _error = null; });
    try {
      final d = await ApiClient.get('/portal/virtual-sessions/') as Map<String, dynamic>;
      List<VirtualSessionModel> parse(String k) => (d[k] as List<dynamic>)
          .map((e) => VirtualSessionModel.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() {
        _live         = parse('live');
        _upcoming     = parse('upcoming');
        _hasClassroom = d['has_classroom'] as bool? ?? true;
        _loading      = false;
        _error        = null;
      });
    } on ApiException catch (e) {
      if (!mounted || silent) return;
      setState(() { _error = e.message; _loading = false; });
    } catch (_) {
      if (!mounted || silent) return;
      setState(() { _error = 'تعذّر تحميل الحصص'; _loading = false; });
    }
  }

  Future<void> _join(VirtualSessionModel s) async {
    setState(() => _joiningId = s.id);
    try {
      final d = await ApiClient.post('/portal/virtual-sessions/${s.id}/join/', {})
          as Map<String, dynamic>;
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (_) => _JoinSheet(
          session:     s,
          joinUrl:     d['join_url']?.toString() ?? '',
          password:    d['password']?.toString() ?? '',
          displayName: d['display_name']?.toString() ?? '',
        ),
      );
      _load(silent: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      _load(silent: true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذّر الدخول للحصة، حاول مرة أخرى')),
      );
    } finally {
      if (mounted) setState(() => _joiningId = null);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: kColorBg,
        appBar: AppBar(title: const Text('الحصص المباشرة')),
        body: _loading
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
                        if (!_hasClassroom)
                          const _EmptyState(
                            icon: Icons.school_outlined,
                            text: 'الطالب غير مسجّل في فصل حاليًا',
                          )
                        else ...[
                          if (_live.isNotEmpty) ...[
                            const _SectionTitle('الآن'),
                            ..._live.map((s) => _LiveCard(
                                  session: s,
                                  joining: _joiningId == s.id,
                                  onJoin:  () => _join(s),
                                )),
                            const SizedBox(height: 12),
                          ],
                          const _SectionTitle('الحصص القادمة'),
                          if (_upcoming.isEmpty)
                            const _EmptyState(
                              icon: Icons.event_available_outlined,
                              text: 'لا توجد حصص مجدولة خلال الأسبوعين القادمين',
                            )
                          else
                            ..._upcoming.map((s) => _UpcomingCard(session: s)),
                        ],
                      ],
                    ),
                  ),
      );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const _days = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const _months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

String _time(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  return '$h:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'ص' : 'م'}';
}

String _dayLabel(DateTime d) {
  final now   = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final diff  = DateTime(d.year, d.month, d.day).difference(today).inDays;
  if (diff == 0) return 'اليوم';
  if (diff == 1) return 'غدًا';
  return '${_days[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10, top: 4),
        child: Text(text, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
      );
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String   text;
  const _EmptyState({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            Icon(icon, size: 44, color: Colors.grey.shade300),
            const SizedBox(height: 10),
            Text(text, style: TextStyle(color: Colors.grey.shade400)),
          ],
        ),
      );
}

// ── Live card ─────────────────────────────────────────────────────────────────

class _LiveCard extends StatelessWidget {
  final VirtualSessionModel session;
  final bool         joining;
  final VoidCallback onJoin;
  const _LiveCard({required this.session, required this.joining, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    final notStarted = DateTime.now().isBefore(session.startsAt);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: _kLive.withOpacity(0.35), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _kLive.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.circle, size: 8, color: _kLive),
                      const SizedBox(width: 6),
                      Text(
                        notStarted ? 'تبدأ ${_time(session.startsAt)}' : 'مباشر الآن',
                        style: const TextStyle(fontSize: 12, color: _kLive, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (session.attended)
                  const Row(
                    children: [
                      Icon(Icons.check_circle, size: 16, color: Color(0xFF16A34A)),
                      SizedBox(width: 4),
                      Text('تم تسجيل الحضور',
                          style: TextStyle(fontSize: 12, color: Color(0xFF16A34A), fontWeight: FontWeight.w600)),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(session.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(
              [
                session.classroomName,
                if (session.teacherName != null) session.teacherName!,
                '${_time(session.startsAt)} – ${_time(session.endsAt)}',
              ].join('  •  '),
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kLive,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: joining ? null : onJoin,
                icon: joining
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.videocam),
                label: Text(
                  session.attended ? 'الدخول مرة أخرى' : 'دخول الحصة',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Upcoming card ─────────────────────────────────────────────────────────────

class _UpcomingCard extends StatelessWidget {
  final VirtualSessionModel session;
  const _UpcomingCard({required this.session});

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 52,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: kColorPrimary.withOpacity(0.07),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Text('${session.startsAt.day}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kColorPrimary)),
                    Text(_months[session.startsAt.month - 1],
                        style: const TextStyle(fontSize: 10, color: kColorPrimary)),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(session.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(
                      '${_dayLabel(session.startsAt)}  •  ${_time(session.startsAt)}  •  ${session.durationMinutes} دقيقة',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
              Icon(Icons.schedule, size: 18, color: Colors.grey.shade400),
            ],
          ),
        ),
      );
}

// ── Join sheet ────────────────────────────────────────────────────────────────

class _JoinSheet extends StatelessWidget {
  final VirtualSessionModel session;
  final String joinUrl;
  final String password;
  final String displayName;
  const _JoinSheet({
    required this.session,
    required this.joinUrl,
    required this.password,
    required this.displayName,
  });

  Future<void> _open(BuildContext context) async {
    // اسم الطالب بالحافظة — Zoho يطلب اسمًا عند الدخول وهذا ما يظهر للمعلم/ة
    await Clipboard.setData(ClipboardData(text: displayName));
    final ok = await launchUrl(Uri.parse(joinUrl), mode: LaunchMode.externalApplication);
    if (!context.mounted) return;
    if (ok) {
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذّر فتح رابط الحصة')),
      );
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(session.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              _InfoRow(
                icon:  Icons.badge_outlined,
                label: 'الاسم عند الدخول',
                value: displayName,
              ),
              if (password.isNotEmpty)
                _InfoRow(icon: Icons.lock_outline, label: 'كلمة مرور الحصة', value: password),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.fiber_manual_record, size: 16, color: Color(0xFFB45309)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'هذه الحصة مسجّلة وفق متطلبات الوزارة. سيُنسخ اسم الطالب تلقائيًا، الصقه عندما يطلب منك Zoho الاسم.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _kLive,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => _open(context),
                  icon: const Icon(Icons.videocam),
                  label: const Text('فتح الحصة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String   label;
  final String   value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            Icon(icon, size: 18, color: Colors.grey.shade500),
            const SizedBox(width: 8),
            Text('$label: ', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
            Expanded(
              child: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            ),
            IconButton(
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.copy, size: 16),
              tooltip: 'نسخ',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('تم النسخ'), duration: Duration(seconds: 1)),
                );
              },
            ),
          ],
        ),
      );
}
