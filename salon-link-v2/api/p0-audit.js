module.exports = async function handler(req, res) {
  const url = 'https://cpmmqqznrqeodlesyfgg.supabase.co/functions/v1/salon-link-v2-public';

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const html = await response.text();
    const any = (...needles) => needles.some((needle) => html.includes(needle));
    const all = (...needles) => needles.every((needle) => html.includes(needle));

    const matrix = {
      auth: all('signUp', 'signIn', 'signOut', 'resetPassword', 'PASSWORD_RECOVERY'),
      workSlotCreate: any('createWorkSlot', 'create_work_slot'),
      workSlotDetail: all('workSlots', '募集詳細'),
      applications: any('applications', 'application_create'),
      applicationQuoteDm: any('applicationQuote', 'application_quote_message'),
      offers: all('offers', 'countered', 'proposed_changes'),
      availability: any('availability', '空き枠'),
      workGroup: all('work_group', '募集グループ'),
      groupChat: any('conversationSend', 'conversation_send'),
      pinnedMessage: any('pinMessage', 'conversation_pin_message', '固定'),
      checklist: all('checklist', '準備'),
      attendance: all('work_start', 'break_start', 'break_end', 'work_end'),
      attendanceAdjustment: any('workTimeChange', 'work_time_change', '勤怠修正'),
      compensation: all('compensation', '報酬'),
      payment: all('payment', '支払い済みにする', '受け取りました'),
      reviews: all('review', 'レビュー'),
      conditionChange: any('slotChange', '条件変更', 'propose_slot_change'),
      cancel: any('cancelWork', 'cancel_work', 'キャンセル'),
      noShow: any('noShow', 'no_show', '未到着'),
      reports: any('report', '通報'),
      blocks: any('blockUser', 'block_user', 'ブロック'),
      verification: all('verification-documents', 'submit_verification_request', '本人確認'),
      learning: all('want_to_learn', 'can_teach'),
      verifiedExperience: any('verified_work_experience', 'work_experience', '経験した技術'),
      repeat: any('repeatOffer', 'repeat_offer', 'もう一度依頼'),
      duplicateWork: any('duplicateWorkSlot', 'duplicate_work_slot', '複製'),
      notifications: any('notifications', '通知'),
      admin: any('admin', '管理'),
      withdrawal: any('withdrawAccount', 'withdraw_account', '退会'),
      fiveNav: all(
        "['home','⌂','ホーム']",
        "['schedule','▣','日程']",
        "['search','⌕','探す']",
        "['contacts','✉','連絡']",
        "['settings','⚙','設定']",
      ),
    };

    const missing = Object.entries(matrix)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      upstream: response.status,
      htmlBytes: Buffer.byteLength(html, 'utf8'),
      passed: Object.values(matrix).filter(Boolean).length,
      total: Object.keys(matrix).length,
      missing,
      matrix,
    }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(error?.message || error) }));
  }
};
