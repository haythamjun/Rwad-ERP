import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../providers/auth_provider.dart';
import '../widgets/status_badge.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final student  = auth.student;
    final guardian = auth.guardian;

    return Scaffold(
      appBar: AppBar(title: const Text('الملف الشخصي')),
      backgroundColor: kColorBg,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Student card ───────────────────────────────────────────────
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar + name
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 34,
                        backgroundColor: kColorPrimary.withOpacity(0.1),
                        child: Text(
                          student?.fullName.isNotEmpty == true
                              ? student!.fullName[0]
                              : '؟',
                          style: const TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w900,
                            color: kColorPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              student?.fullName ?? '—',
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 6),
                            if (student != null)
                              StatusBadge(
                                status: student.status,
                                label: student.statusDisplay,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1),
                  ),

                  const _SectionLabel('بيانات المستفيد'),
                  const SizedBox(height: 12),
                  _Row('رقم الملف',       student?.fileNumber       ?? '—'),
                  _Row('رقم الهوية',      student?.nationalId       ?? '—'),
                  _Row('تاريخ الميلاد',
                      student != null
                          ? '${student.dateOfBirth}  (${student.age} سنة)'
                          : '—'),
                  _Row('الجنس',           student?.genderDisplay    ?? '—'),
                  if ((student?.disabilityDisplay?.isNotEmpty ?? false))
                    _Row('نوع الإعاقة',   student!.disabilityDisplay!),
                  if ((student?.disabilityDegree?.isNotEmpty ?? false))
                    _Row('درجة الإعاقة',  student!.disabilityDegree!),
                  if (student?.branchName != null)
                    _Row('الفرع',          student!.branchName!),
                  _Row('تاريخ التسجيل',   student?.registrationDate ?? '—'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // ── Guardian card ─────────────────────────────────────────────
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionLabel('بيانات ولي الأمر'),
                  const SizedBox(height: 12),
                  _Row('الاسم',   guardian?.name         ?? '—'),
                  _Row('الصلة',   guardian?.relationship ?? '—'),
                  _Row('الجوال',  guardian?.phone        ?? '—'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 28),

          // ── Logout ────────────────────────────────────────────────────
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context),
            icon: const Icon(Icons.logout_rounded, color: Colors.red),
            label: const Text(
              'تسجيل الخروج',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.w700),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),

          const SizedBox(height: 32),
          Text(
            'مركز رؤية للتأهيل  •  v1.0.0',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('تسجيل الخروج'),
        content: const Text('هل تريد تسجيل الخروج من بوابة أولياء الأمور؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('خروج', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<AuthProvider>().logout();
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: kColorPrimary,
        ),
      );
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 112,
              child: Text(
                label,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
              ),
            ),
            Expanded(
              child: Text(
                value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
}
