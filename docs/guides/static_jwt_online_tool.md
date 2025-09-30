
## Source

https://tiptap.dev/docs/collaboration/getting-started/authenticate#create-a-static-jwt-for-testing

### **Creating a static JWT for testing**

For testing purposes, I generated the signed JWT using online tool http://jwtbuilder.jamiekurtz.com/. 

- I was able to easily create a signed JWT by **ONLY REPLACING THE “Key” FIELD WITH MY CONTENT AI SECRET KEY.**
- I did not change any other information in the placeholder payload, and merely clicked “Create Signed JWT” using the default HS256 algorithm as you can see in the bottom of the page screenshot here: /Users/andresterranova/manuscript-ballast/public/JWT_Builder.png
- Signed JWT value: 
`eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3NTkyNjEyMTAsImV4cCI6MTc5MDc5NzIxMCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.WSYoinPIT8xd4YK7fMbvKHG3-O3JhN6LHJpgvs_tQXA`
- Note that consistent across all working signed JWTs is the 3-part structure of it.

### Generated Claim Set

```

{
    "iss": "Online JWT Builder",
    "iat": 1759261210,
    "exp": 1790797210,
    "aud": "www.example.com",
    "sub": "jrocket@example.com",
    "GivenName": "Johnny",
    "Surname": "Rocket",
    "Email": "jrocket@example.com",
    "Role": [
        "Manager",
        "Project Administrator"
    ]
}
```

### Content AI Secret:

Key: TkAy9iyzi3rrux9P3U4m4ysaYayFE9kCr9Ff36DPFJAErOeGpDU8siu1UXJBUtco