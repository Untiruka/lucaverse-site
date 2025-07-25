// app/screen/massage/privacy/page.tsx

import React from "react"

export default function PrivacyPage() {
  return (
    <div className="bg-black text-white font-sans p-6 leading-7 min-h-screen">
      <h1 className="text-3xl text-yellow-300 mb-6">プライバシーポリシー</h1>

      <p className="mb-4">
        本アプリ「断ち花」は、ユーザーのプライバシーを尊重し、個人情報保護の重要性を認識しています。<br />
        アプリ内で取得する情報、利用目的、第三者提供については以下の通りです。
      </p>
      <p className="mb-6" lang="en">
        Our app "Tachibana" respects your privacy and recognizes the importance of protecting personal information.<br />
        The types of information collected, the purposes of use, and the sharing of information with third parties are described below.
      </p>

      <ul className="list-disc list-inside space-y-2 mb-6">
        <li>
          本アプリは、ユーザーの電話番号や住所などの機微な個人情報は取得しませんが、アカウント登録やアプリ機能提供のために、ユーザーが入力した情報や利用状況データを収集・利用します。
        </li>
        <li>ユーザーからご連絡をいただいた際のメールアドレス等は、サポート目的以外で利用しません。</li>
        <li>本アプリは第三者に個人情報を提供することはありません。</li>
        <li>
          お問い合わせは{" "}
          <a href="mailto:hello.tachibana@proton.me" className="text-blue-300 underline">
            hello.tachibana@proton.me
          </a>{" "}
          までご連絡ください。
        </li>
      </ul>

      <ul className="list-disc list-inside space-y-2 mb-6" lang="en">
        <li>
          This app does not collect sensitive personal information such as phone numbers or addresses. However, we do collect and use information provided by users during registration and data related to app usage in order to provide app features.
        </li>
        <li>Email addresses or other contact information provided by users will not be used for any purpose other than support.</li>
        <li>This app will never share personal information with third parties.</li>
        <li>
          If you have any questions, please contact us at{" "}
          <a href="mailto:hello.tachibana@proton.me" className="text-blue-300 underline">
            hello.tachibana@proton.me
          </a>
          .
        </li>
      </ul>

      <p className="mb-6">本ポリシーは、必要に応じて変更される場合があります。</p>

      <h2 className="text-2xl text-yellow-300 mb-4">アカウント削除について</h2>

      <p className="mb-6">
        アカウント削除はアプリ内の「設定」画面からいつでも行えます。<br />
        削除手順が分からない場合や、アプリ内で削除ができない場合は、{" "}
        <a href="mailto:hello.tachibana@proton.me" className="text-blue-300 underline">
          hello.tachibana@proton.me
        </a>{" "}
        までご連絡ください。
        <br />
        <br />
        <span lang="en">
          You can delete your account at any time from the "Settings" screen in the app.<br />
          If you have trouble deleting your account or need assistance, please contact us at{" "}
          <a href="mailto:hello.tachibana@proton.me" className="text-blue-300 underline">
            hello.tachibana@proton.me
          </a>
          .
        </span>
      </p>
    </div>
  )
}
