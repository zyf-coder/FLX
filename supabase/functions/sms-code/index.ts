import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const sha256 = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const hmac = async (key: Uint8Array, value: string) =>
  new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      ),
      encoder.encode(value)
    )
  );
const tencentRequest = async (
  action: string,
  payload: Record<string, unknown>
) => {
  const secretId = Deno.env.get("TENCENTCLOUD_SECRET_ID")!;
  const secretKey = Deno.env.get("TENCENTCLOUD_SECRET_KEY")!;
  const service = "sms";
  const host = "sms.tencentcloudapi.com";
  const region = Deno.env.get("TENCENTCLOUD_REGION") || "ap-guangzhou";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const hashedPayload = await sha256(body);
  const canonical = `content-type:application/json; charset=utf-8\nhost:${host}\n\ncontent-type;host\n${hashedPayload}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${await sha256(
    canonical
  )}`;
  const secretDate = await hmac(encoder.encode(`TC3${secretKey}`), date);
  const secretService = await hmac(secretDate, service);
  const secretSigning = await hmac(secretService, "tc3_request");
  const signature = hex(await hmac(secretSigning, stringToSign));
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
  const response = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Host: host,
      Authorization: authorization,
      "X-TC-Action": action,
      "X-TC-Version": "2021-01-11",
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": region,
    },
    body,
  });
  return await response.json();
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  try {
    const { action, phone, purpose, code } = await request.json();
    if (!/^1\d{10}$/.test(phone) || !["send", "verify"].includes(action))
      return json({ error: "请求参数不正确" }, 400);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const key = `${purpose}:${phone}`;
    if (action === "send") {
      const { data: recent } = await supabase
        .from("sms_codes")
        .select("created_at")
        .eq("lookup_key", key)
        .maybeSingle();
      if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000)
        return json({ error: "请稍后再获取验证码" }, 429);
      const value = String(Math.floor(100000 + Math.random() * 900000));
      const result = await tencentRequest("SendSms", {
        SmsSdkAppId: Deno.env.get("TENCENT_SMS_APP_ID"),
        SignName: Deno.env.get("TENCENT_SMS_SIGN_NAME"),
        TemplateId: Deno.env.get("TENCENT_SMS_TEMPLATE_ID"),
        PhoneNumberSet: [`+86${phone}`],
        TemplateParamSet: [value, "5"],
      });
      if (result.Response?.Error) return json({ error: "短信发送失败" }, 502);
      await supabase
        .from("sms_codes")
        .upsert(
          {
            lookup_key: key,
            code_hash: await sha256(value),
            expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
            attempts: 0,
            created_at: new Date().toISOString(),
          },
          { onConflict: "lookup_key" }
        );
      return json({ ok: true });
    }
    const { data } = await supabase
      .from("sms_codes")
      .select("code_hash,expires_at,attempts")
      .eq("lookup_key", key)
      .maybeSingle();
    if (
      !data ||
      data.attempts >= 5 ||
      new Date(data.expires_at).getTime() < Date.now()
    )
      return json({ error: "验证码错误或已失效" }, 400);
    if ((await sha256(String(code))) !== data.code_hash) {
      await supabase
        .from("sms_codes")
        .update({ attempts: data.attempts + 1 })
        .eq("lookup_key", key);
      return json({ error: "验证码错误或已失效" }, 400);
    }
    await supabase.from("sms_codes").delete().eq("lookup_key", key);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "短信服务暂不可用" }, 500);
  }
});
