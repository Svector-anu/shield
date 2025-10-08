
const litAction = `
  const go = async () => {
    // The static IPFS CID of the data to be pinned.
    // This is passed in as a parameter to the Lit Action.
    const data = encryptedData;
    const type = dataType;

    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    
    const pinataData = {
      pinataContent: type === "json" ? JSON.parse(data) : data,
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.PINATA_JWT,
      },
      body: JSON.stringify(pinataData),
    });

    if (resp.ok) {
      const data = await resp.json();
      Lit.Actions.setResponse({ response: JSON.stringify({ cid: data.IpfsHash }) });
    } else {
      const errorText = await resp.text();
      Lit.Actions.setResponse({ response: JSON.stringify({ error: 'Failed to pin to Pinata: ' + errorText }) });
    }
  };

  go();
`;

export default litAction;
