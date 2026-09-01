import 'package:flutter/material.dart';

const String kBaseUrl = 'https://roya-backend-production.up.railway.app/api';

const Color kColorPrimary      = Color(0xFF0F2A47);
const Color kColorPrimaryLight = Color(0xFF1E3A5F);
const Color kColorBg           = Color(0xFFF8FAFC);

const Map<String, Color> kStatusColors = {
  'active':      Color(0xFF16A34A),
  'pending':     Color(0xFFD97706),
  'inactive':    Color(0xFF6B7280),
  'graduated':   Color(0xFF2563EB),
  'suspended':   Color(0xFFDC2626),
  'transferred': Color(0xFF7C3AED),
  'rejected':    Color(0xFFE11D48),
};

const Map<String, Color> kAttendanceColors = {
  'present':         Color(0xFF16A34A),
  'absent':          Color(0xFFDC2626),
  'late':            Color(0xFFD97706),
  'excused_absence': Color(0xFF2563EB),
  'early_leave':     Color(0xFFEA580C),
};
