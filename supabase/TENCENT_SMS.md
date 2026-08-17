# 腾讯云短信接入

## 腾讯云准备

1. 完成腾讯云实名认证并开通短信服务。
2. 创建国内短信应用，记录 `SDK AppID`。
3. 申请短信签名，记录审核通过的签名内容。
4. 申请验证码模板，模板内容建议为：`您的验证码为{1}，{2}分钟内有效，请勿泄露。`
5. 创建仅允许调用短信发送接口的子账号 API 密钥。

## Supabase 部署

先在 Supabase SQL Editor 执行 `sms_codes.sql`，然后使用 Supabase CLI：

```powershell
supabase login
supabase link --project-ref bzwongzpggcjwyszleeb
supabase secrets set TENCENTCLOUD_SECRET_ID=填写SecretId
supabase secrets set TENCENTCLOUD_SECRET_KEY=填写SecretKey
supabase secrets set TENCENT_SMS_APP_ID=填写SDKAppID
supabase secrets set TENCENT_SMS_SIGN_NAME=填写审核通过的短信签名
supabase secrets set TENCENT_SMS_TEMPLATE_ID=填写审核通过的模板ID
supabase secrets set TENCENTCLOUD_REGION=ap-guangzhou
supabase functions deploy sms-code
```

所有密钥只能保存在 Supabase Secrets，不要写入 `.env.local`、Vue 代码或 GitHub。

## 安全规则

- 同一手机号 60 秒内只能发送一次。
- 验证码 5 分钟失效。
- 连续输错 5 次后验证码失效。
- 数据库只保存验证码 SHA-256 哈希，不保存验证码明文。
