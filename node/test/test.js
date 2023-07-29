// Testing CBOR.js API
import CBOR from '../node-cbor.js';

let failures = 0;
let test = 0;
let name = '';

function assertTrue(text, bool) {
  if (!bool) throw Error("Assertion: " + text);
}

function assertFalse(text, bool) {
  if (bool) throw Error("Assertion: " + text);
}

function success() {
  console.log('Test ' + name + ' was successful');
}

let TESTS=[

{name:'base64.js',
file:String.raw`// Testing the B64U/B64 converters

let bin = new Uint8Array(256);
for (let i = 0; i < bin.length; i++) {
  bin[i] = i;
}
let b64U = CBOR.toBase64Url(bin);
assertFalse("cmp1", CBOR.compareArrays(bin, CBOR.fromBase64Url(b64U)));

// This is what "btoa" returns for bin:
let b64 = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissL\
S4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY\
2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYm\
ZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz\
9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==';

// fromBase64Url is "permissive" and takes Base64 with padding as well...
assertFalse("cmp2", CBOR.compareArrays(bin, CBOR.fromBase64Url(b64)));

assertFalse("cmp3", CBOR.compareArrays(CBOR.fromBase64Url('oQVkZGF0YQ'), 
                                       CBOR.fromHex('a1056464617461')));
// Zero data is compliant
assertFalse("cmp4", CBOR.compareArrays(CBOR.fromBase64Url(''), new Uint8Array()));
assertTrue("cmp4", CBOR.toBase64Url(new Uint8Array()) == "");
success();
`}
,
{name:'check-for-unread.js',
file:String.raw`// Testing the "checkForUnread()" feature

function oneTurn(create, access, ok) {
  let res = eval(create);
  try {
    res.checkForUnread();
    throw Error("no way");
  } catch (error) {
    if (!error.toString().includes('never read')) {
      throw error;
    }
  }
  try {
    eval(access);
    res.checkForUnread();
    assertTrue("cfu1", ok);
  } catch (error) {
    if (!error.toString().includes('never read')) {
      throw error;
    }
    assertFalse("cfu2", ok);
  }
  res.scan().checkForUnread();
  res = CBOR.decode(res.encode());
  try {
    eval(access);
    res.checkForUnread();
    assertTrue("cfu3", ok);
  } catch (error) {
    if (!error.toString().includes('never read')) {
      throw error;
    }
    assertFalse("cfu4", ok);
  }
  res.scan().checkForUnread();
}

oneTurn("CBOR.Array().add(CBOR.Map().set(CBOR.Int(1), CBOR.String('hi')))",
        "res",
        false);

oneTurn("CBOR.Array().add(CBOR.Map().set(CBOR.Int(1), CBOR.String('hi')))",
        // Missing getArray()
        "res.get(0).getMap().get(CBOR.Int(1)).getString()",
        false);

oneTurn("CBOR.Array().add(CBOR.Map().set(CBOR.Int(1), CBOR.String('hi')))",
        // Missing getMap()
        "res.getArray().get(0).get(CBOR.Int(1)).getString()",
        false);

oneTurn("CBOR.Array().add(CBOR.Map().set(CBOR.Int(1), CBOR.String('hi')))",
        "res.getArray().get(0).getMap().get(CBOR.Int(1)).getString()",
        true);

oneTurn("CBOR.Tag(8n, CBOR.Map().set(CBOR.Int(1), CBOR.String('hi')))",
        "res.getTag().getTaggedObject().getMap().get(CBOR.Int(1)).getString()",
        true);

oneTurn("CBOR.Tag(8n, CBOR.Map().set(CBOR.Int(1), CBOR.String('hi')))",
        // Missing getTag()
        "res.getTaggedObject().getMap().get(CBOR.Int(1)).getString()",
        false);

oneTurn("CBOR.Int(1)",
        "res.getInt()",
        true);
success();
`}
,
{name:'clone.js',
file:String.raw`// Testing the "clone()" and "equals() methods

let object = CBOR.Map()
                 .set(CBOR.Int(2), CBOR.Array()
                                       .add(CBOR.Boolean(false)));
assertTrue("clone+equals", object.equals(object.clone()));
let copy = object.clone().set(CBOR.Int(1), CBOR.String("Hi"));
assertFalse("copy+equals+clone", copy.equals(object));

success();
`}
,
{name:'cotx.js',
file:String.raw`// Testing the COTX identifier

function oneTurn(hex, dn, ok) {
  try {
    CBOR.decode(CBOR.fromHex(hex));
    assertTrue("Should not execute", ok);
  } catch (error) {
    assertFalse("Must succeed", ok);
  }

  try {
    let decoder = CBOR.initExtended(CBOR.fromHex(hex), false, false);
    let object = CBOR.decodeExtended(decoder);
    assertTrue("Should not execute", ok);
    if (object.toString() != dn.toString() || !object.equals(CBOR.decode(object.encode()))) {
      throw Error("non match:" + dn + " " + object.toString());
    }
  } catch (error) {
    if (ok) console.log(error.toString());
    assertFalse("Must succeed", ok);
  }
}

oneTurn('d903f2623737', '1010("77")', false);
oneTurn('d903f281623737', '1010(["77"])', false);
oneTurn('d903f28206623737', '1010([6, "77"])', false);
oneTurn('d903f28262373707', '1010(["77", 7])', true);

success();
`}
,
{name:'diagnostic.js',
file:String.raw`// Testing "diagnostic notation"

function oneTurn(cborText, ok, compareWithOrNull) {
  try {
    let compareText = compareWithOrNull ? compareWithOrNull : cborText;
    let result = CBOR.diagDecode(cborText);
    assertTrue("Should not", ok);
    let sequence = CBOR.diagDecodeSequence(cborText);
    if (result.toString() != compareText) {
      throw Error("input:\n" + cborText + "\nresult:\n" + result);
    }
    assertTrue("seq", sequence.length == 1);
    if (sequence[0].toString() != compareText) {
      throw Error("input:\n" + cborText + "\nresult:\n" + result);
    }
  } catch (error) {
    assertFalse("Err", ok);
  }
}

oneTurn("2", true, null);
oneTurn("2.0", true, null);
oneTurn("123456789012345678901234567890", true, null);
oneTurn("Infinity", true, null);
oneTurn("-Infinity", true, null);
oneTurn("NaN", true, null);
oneTurn("0.0", true, null);
oneTurn("-0.0", true, null);
oneTurn('{\n  4: "hi"\n}', true, null);
oneTurn('[4, true, false, null]', true, null);
oneTurn('"next\\nline"', true, null);
oneTurn('0b100_000000001', true, "2049");
oneTurn('4.0e+500', false, null);
oneTurn('4.0e+5', false, "400000.0");
oneTurn('"missing', false, null);

let cborObject = CBOR.decode(CBOR.fromHex('a20169746578740a6e6578740284fa3380000147a10564646\
17461a1f5f4c074323032332d30362d30325430373a35333a31395a'));

let cborText = '{\n  1: "text\\nnext",\n  2: [5.960465188081798e-8, h\'a1056464617461\', {\n' +
    '    true: false\n  }, 0("2023-06-02T07:53:19Z")]\n}';

assertTrue("pretty", cborObject.toDiag(true) == cborText);
assertTrue("oneline", cborObject.toDiag(false) == 
                   cborText.replaceAll('\n', '').replaceAll(' ',''));
assertTrue("parse", CBOR.diagDecode(cborText).equals(cborObject));
let sequence = CBOR.diagDecodeSequence('45,{4:7}');
assertTrue("seq2", sequence.length == 2);
assertTrue("seq3", sequence[0].getInt() == 45);
assertTrue("seq4", sequence[1].equals(CBOR.Map().set(CBOR.Int(4),CBOR.Int(7))));
success();
`}
,
{name:'float.js',
file:String.raw`// Test program for floating point "edge cases"

function oneTurn(value, expected) {
  let text = value.toString();
  while (text.length < 25) {
    text += ' ';
  }
  let cbor = CBOR.Float(value).encode();
  let got = CBOR.toHex(cbor);
  if (got != expected) {
    got = '***=' + got;
  } else {
    got = '';
  }
  if (CBOR.decode(cbor).getFloat() != value) {
    throw Error("Failed decoding: " + value);
  }
  while (expected.length < 20) {
    expected += ' ';
  }
  if (got.length) {
    throw Error(text + expected + got);
  }
}
oneTurn(6.10649585723877e-5, 'fa38801000');
oneTurn(10.559998512268066, 'fa4128f5c1');
oneTurn(65472.0, 'f97bfe');
oneTurn(65472.00390625, 'fa477fc001');
oneTurn(65503.0, 'fa477fdf00');
oneTurn(65504.0, 'f97bff');
oneTurn(65504.00390625, 'fa477fe001');
oneTurn(65504.5, 'fa477fe080');
oneTurn(65505.0, 'fa477fe100');
oneTurn(131008.0, 'fa47ffe000');
oneTurn(-5.960464477539062e-8, 'fbbe6fffffffffffff');
oneTurn(-5.9604644775390625e-8, 'f98001');
oneTurn(-5.960464477539064e-8, 'fbbe70000000000001');
oneTurn(-5.960465188081798e-8, 'fab3800001');
oneTurn(-5.963374860584736e-8, 'fab3801000');
oneTurn(-5.966285243630409e-8, 'fab3802000');
oneTurn(-8.940696716308594e-8, 'fab3c00000');
oneTurn(-0.00006097555160522461, 'f983ff');
oneTurn(-0.00006097555160522469, 'fbbf0ff8000000000c');
oneTurn(-0.000060975551605224615, 'fbbf0ff80000000001');
oneTurn(-0.0000609755516052246127, 'f983ff');
oneTurn(-0.0000609755516052246128, 'fbbf0ff80000000001');
oneTurn(0.00006103515625, 'f90400');
oneTurn(0.00006103515625005551, 'fb3f10000000001000');
oneTurn(1.401298464324817e-45, 'fa00000001');
oneTurn(1.1754942106924411e-38, 'fa007fffff');
oneTurn(0.00006109476089477539, 'f90401');
oneTurn(7.52316384526264e-37, 'fa03800000');
oneTurn(1.1754943508222875e-38, 'fa00800000');

success();
`}
,
{name:'hex.js',
file:String.raw`// Test of "hex" utility methods

const hex = '0123456789abcdefABCDEF';

let bin = CBOR.fromHex(hex);
let cnv = CBOR.toHex(bin);
assertFalse("hex", CBOR.compareArrays(bin, CBOR.fromHex(cnv)));
let ref = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xab, 0xcd, 0xef]);
assertFalse("bin", CBOR.compareArrays(bin, ref));
try {
  CBOR.fromHex("AAA");
  throw Error("should not");
} catch (error) {
  if (!error.toString().includes("Unev")) {
    console.log(error);
  }
}

try {
  CBOR.fromHex("Ag");
  throw Error("should not");
} catch (error) {
  if (!error.toString().includes("Bad hex")) {
    console.log(error);
  }
}
// Zero hex is accepted as well...
assertFalse("zero", CBOR.compareArrays(CBOR.fromHex(''), new Uint8Array()));
success();
`}
,
{name:'integer.js',
file:String.raw`// Test program for integer "edge cases"

function oneTurn(value, expected) {
  let text = value.toString();
  while (text.length < 25) {
    text += ' ';
  }
  let cbor = CBOR.BigInt(value).encode();
  let got = CBOR.toHex(cbor);
  if (got != expected) {
    got = '***=' + got;
  } else {
    got = '';
  }
  assertTrue("Failed decoding: " + value, CBOR.decode(cbor).getBigInt() == value);
  while (expected.length < 20) {
    expected += ' ';
  }
  if (got.length) {
    fail(text + expected + got);
  }
}
oneTurn(0n, '00');
oneTurn(-1n, '20');
oneTurn(255n, '18ff');
oneTurn(256n, '190100');
oneTurn(-256n, '38ff');
oneTurn(-257n, '390100');
oneTurn(1099511627775n, '1b000000ffffffffff');
oneTurn(18446744073709551615n, '1bffffffffffffffff');
oneTurn(18446744073709551616n, 'c249010000000000000000');
oneTurn(-18446744073709551616n, '3bffffffffffffffff');
oneTurn(-18446744073709551617n, 'c349010000000000000000');

try {
  CBOR.Int(1.1);
  fail("Should not");
} catch (error) {
  assertTrue("msg1", error.toString().includes("Argument is not an integer"));
}
try {
  CBOR.Int("10");
  fail("Should not");
} catch (error) {
  assertTrue("msg2", error.toString().includes("Argument is not a 'Number'"));
}
try {
  CBOR.BigInt("10");
  fail("Should not");
} catch (error) {
  assertTrue("msg3", error.toString().includes("Argument is not a 'BigInt'"));
}
try {
  CBOR.BigInt(1n, 7);
  fail("Should not");
} catch (error) {
  assertTrue("msg4", error.toString().includes("CBOR.BigInt expects 1 argument(s)"));
}
try {
  CBOR.Int(1, 7);
  fail("Should not");
} catch (error) {
  assertTrue("msg4", error.toString().includes("CBOR.Int expects 1 argument(s)"));
}

success();
`}
,
{name:'maps.js',
file:String.raw`// Testing map operations

let map = CBOR.Map()
              .set(CBOR.Int(3), CBOR.String("three"))
              .set(CBOR.Int(4), CBOR.String("four"));
assertTrue("size-0", map.length == 2);
let keys = map.getKeys();
assertTrue("size-1", keys.length == 2);
assertTrue("get-0", map.get(keys[0]).getString() == "three");
assertTrue("get-1", map.get(keys[1]).getString() == "four");

assertTrue("rem-0", map.remove(CBOR.Int(4)).getString() == "four");
assertTrue("size-2", map.length == 1);
assertTrue("avail-0", map.containsKey(CBOR.Int(3)));
assertFalse("avail-1", map.containsKey(CBOR.Int(4)));
assertTrue("cond-0", map.getConditionally(CBOR.Int(3), CBOR.String("k3")).getString() == "three");
assertTrue("cond-1", map.getConditionally(CBOR.Int(4), CBOR.String("k4")).getString() == "k4");

success();
`}
,
{name:'miscellaneous.js',
file:String.raw`// miscellaneous tests

let bin = new Uint8Array([0xa5, 0x01, 0xd9, 0x01, 0xf4, 0x81, 0x18, 0x2d, 0x02, 0xf9, 0x80, 0x10,
                          0x04, 0x64, 0x53, 0x75, 0x72, 0x65, 0x05, 0xa2, 0x08, 0x69, 0x59, 0x65,
                          0x0a, 0x01, 0x61, 0x68, 0xe2, 0x82, 0xac, 0x09, 0x85, 0x66, 0x42, 0x79,
                          0x74, 0x65, 0x73, 0x21, 0x45, 0x01, 0x02, 0x03, 0x04, 0x05, 0xf5, 0xf4,
                          0xf6, 0x06, 0xc2, 0x4b, 0x66, 0x1e, 0xfd, 0xf2, 0xe3, 0xb1, 0x9f, 0x7c, 
                          0x04, 0x5f, 0x15]);

let cbor = CBOR.Map()
               .set(CBOR.Int(5),
                    CBOR.Map()
                        .set(CBOR.Int(8), CBOR.String("Ye\n\u0001ah€"))
                        .set(CBOR.Int(9),
                             CBOR.Array()
                                 .add(CBOR.String("Bytes!"))
                                 .add(CBOR.Bytes(new Uint8Array([1,2,3,4,5])))
                                 .add(CBOR.Boolean(true))
                                 .add(CBOR.Boolean(false))
                                 .add(CBOR.Null())))
               .set(CBOR.Int(4), CBOR.String("Sure"))
               .set(CBOR.Int(2), CBOR.Float(-9.5367431640625e-7))
               .set(CBOR.Int(6), CBOR.BigInt(123456789123456789123456789n))
               .set(CBOR.Int(1), CBOR.Tag(500n, CBOR.Array().add(CBOR.Int(45)))).encode();
assertFalse("cmp1", CBOR.compareArrays(bin, cbor));
let array = CBOR.decode(cbor).get(CBOR.Int(5)).get(CBOR.Int(9));
assertTrue("bool1", array.get(2).getBoolean());
assertFalse("bool1", array.get(3).getBoolean());
assertFalse("null1", array.get(3).isNull());
assertTrue("null2", array.get(4).isNull());
assertFalse("cmp2", CBOR.compareArrays(CBOR.diagDecode(CBOR.decode(cbor).toString()).encode(), bin));

success();
`}
,
{name:'nondeterministic.js',
file:String.raw`// Testing "deterministic" code checks

function oneTurn(hex, dn) {
  try {
    CBOR.decode(CBOR.fromHex(hex));
    throw Error("Should not fail on: " + dn);
  } catch (error) {
    if (!error.toString().includes("Non-d")) {
      throw error;
    }
  }
  let decoder = CBOR.initExtended(CBOR.fromHex(hex), false, true);
  let object = CBOR.decodeExtended(decoder);
  if (object.toString() != dn || !object.equals(CBOR.decode(object.encode()))) {
    throw Error("non match:" + dn);
  }
}

oneTurn('1900ff', '255');
oneTurn('1817', '23');
oneTurn('A2026374776F01636F6E65', '{\n  1: "one",\n  2: "two"\n}');
oneTurn('FB7FF8000000000000', 'NaN');
oneTurn('FA7FC00000', 'NaN');
oneTurn('FB3ff0000000000000', '1.0');
oneTurn('c2480100000000000000', '72057594037927936');
oneTurn('c24900ffffffffffffffff', '18446744073709551615');
oneTurn('c240', '0');
oneTurn('f97e01', 'NaN');
oneTurn('c240', '0');

// This one is actually deterministic...
try {
  oneTurn('fa7f7fffff', '3.4028234663852886e+38');
} catch (error) {
  if (!error.toString().includes('Should not')) {
    throw error;
  }
}

success();
`}
,
{name:'out-of-range.js',
file:String.raw`// Number overflow tests.

const TOO_BIG = Number.MAX_SAFE_INTEGER + 1;
const IN_RANGE =  Number.MAX_SAFE_INTEGER;

try {
  CBOR.Int(TOO_BIG);
  throw Error('Should not');
} catch (error) {
  if (error.toString().includes('Should not')) {
    throw error;
  }
}
let cbor = CBOR.BigInt(BigInt(TOO_BIG)).encode();
try {
  CBOR.decode(cbor).getInt();
  throw Error('Should not');
} catch (error) {
  if (error.toString().includes('Should not')) {
    throw error;
  }
}
assertTrue("big", BigInt(TOO_BIG) == CBOR.decode(cbor).getBigInt());

cbor = CBOR.Int(IN_RANGE).encode();
assertTrue("R0", CBOR.decode(cbor).getInt() == IN_RANGE);
cbor = CBOR.Int(-IN_RANGE).encode();
assertTrue("R0", CBOR.decode(cbor).getInt() == -IN_RANGE);

success();
`}
,
{name:'sequence.js',
file:String.raw`// Testing the "sequence" option

let cbor = new Uint8Array([0x05, 0xa1, 0x05, 0x42, 0x6a, 0x6a])
try {
  CBOR.decode(cbor);
  throw Error("Should not");
} catch (error) {
  if (!error.toString().includes('Unexpected')) console.log(error);
}
let decoder = CBOR.initExtended(cbor, true, false);
let total = new Uint16Array();
let object;
while (object = CBOR.decodeExtended(decoder)) {
  total = CBOR.addArrays(total, object.encode());
}
assertFalse("Comp", CBOR.compareArrays(total, cbor));

success();
`}
,
{name:'tags.js',
file:String.raw`// Testing "tag"

let object = CBOR.Array().add(CBOR.String("https://example.com/myobject")).add(CBOR.Int(6));
let cbor = CBOR.Tag(CBOR.Tag.RESERVED_TAG_COTX, object).encode();
let tag = CBOR.decode(cbor);
assertTrue("t3", tag.getTagNumber()== CBOR.Tag.RESERVED_TAG_COTX);
assertTrue("t3.1", object.equals(tag.getTaggedObject()));
tag = CBOR.decode(cbor).getTag();  // Redundant in JavaScript
assertTrue("t3.2", object.equals(tag.getTaggedObject()));
cbor = CBOR.Tag(0xf0123456789abcden, object).encode();
assertTrue("t14", CBOR.decode(cbor).getTagNumber()== 0xf0123456789abcden);
assertTrue("t5", CBOR.toHex(cbor) == 
    "dbf0123456789abcde82781c68747470733a2f2f6578616d706c652e636f6d2f6d796f626a65637406");
try {
  CBOR.Tag(-1n, CBOR.String("minus"));
  throw Error("Should not");
} catch (error) {
  if (!error.toString().includes("out of range")) {
    throw error;
  }
}
try {
  CBOR.Tag(0x10000000000000000n, CBOR.String("minus"));
  throw Error("Should not");
} catch (error) {
  if (!error.toString().includes("out of range")) {
    throw error;
  }
}

try {
  let tag = CBOR.Int(5).getTag();
  throw Error("Should not");
} catch (error) {
  if (!error.toString().includes("CBOR.Int")) {
    throw error;
  }
}

try {
  // Z or -+local offset needed.
  CBOR.Tag(0n, CBOR.String("2023-06-22T00:01:43"));
  throw Error("Should not");
} catch (error) {
  if (!error.toString().includes("ISO")) {
    throw error;
  }
}

try {
  // 24 hour is incorrect.
  CBOR.Tag(0n, CBOR.String("2023-06-22T24:01:43Z"));
  throw Error("Should not");
} catch (error) {
  if (!error.toString().includes("ISO")) {
    throw error;
  }
}

success();
`}
,
{name:'utf8.js',
file:String.raw`// Test of "utf8" converters

function utf8EncoderTest(string, ok) {
  try {
    CBOR.String(string).encode();
    assertTrue("enc", ok);
  } catch (error) {
    assertFalse("No good", ok);
  }

}

function utf8DecoderTest(hex, ok) {
  let cbor = CBOR.fromHex(hex);
  let roundTrip;
  try {
    roundTrip = CBOR.decode(cbor).encode();
  } catch (error) {
    assertFalse("No good", ok);
    return;
  }
  assertTrue("OK", ok);
  assertFalse("Conv", CBOR.compareArrays(cbor, roundTrip));
}

utf8DecoderTest("62c328", false);
utf8DecoderTest("64f0288cbc", false);
utf8DecoderTest("64f0908cbc", true);
utf8EncoderTest("Hi", true)
utf8EncoderTest("\uD83D", false);
utf8EncoderTest("\uD83D\uDE2D", true);

success();
`}

];

function runTest() {
  test = 0;
  failures = 0;
  for (let test = 0; test < TESTS.length; test++) {
    name = TESTS[test].name;
    try {
      eval(TESTS[test].file);
    } catch (error) {
      failures++;
      console.log(name + " FAILED: " + error);
    }
  }
  if (failures) {
    console.log('There were ' + failures + ' errors');
  } else {
    console.log('PASSED');
  }
}

runTest();
