const {
  Keys,
  convertObjectToUint8,
  PUB_KEY,
  SEC_KEY,
  NONCE,
  STRING,
  OBJECT
} = require("./keys");

describe("keys.js", () => {
  describe("convertObjectToUint8", () => {
    it("throws an error if obj is falsy", () => {
      expect(() => {
        convertObjectToUint8(null);
      }).toThrow("Arg size required!");
    });

    it("returns the obj by reference if the obj is a Uint8Array", () => {
      const objectInput = new Uint8Array();
      const result = convertObjectToUint8(objectInput);

      expect(result).toBe(objectInput);
    });

    it("throws and error if object length is zero", () => {
      expect(() => {
        convertObjectToUint8({});
      }).toThrow("Error: variable len must be > 0");
    });

    it("returns the obj as a Uint8Array of copied object properties with the length of said type", () => {
      const mock_nonce = { ...[...Array(24).keys()] };

      const result = convertObjectToUint8(mock_nonce, NONCE);

      result.forEach((val, index) => {
        expect(result[index]).toBe(mock_nonce[index]);
      });
    });

    it("returns the obj as a Uint8Array of copied object properties with the length of said type, with 0 being set in the empty buffer", () => {
      const mock_nonce_not_full = { ...[...Array(12).keys()] };

      const result = convertObjectToUint8(mock_nonce_not_full, NONCE);

      result.forEach((val, index) => {
        expect(result[index]).toBe(mock_nonce_not_full[index] || 0);
      });
    });
  });
});
