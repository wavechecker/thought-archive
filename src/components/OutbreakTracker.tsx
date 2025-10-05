import { useEffect, useState } from "react";
return;
}
} catch (_) {
// ignore and fall through to overrides/props
}
}


// 3) Fallback to window override
if (override && !cancelled) {
setData({
cases: override.cases,
statesAffected: override.statesAffected,
hospitalizations: override.hospitalizations,
deaths: override.deaths,
lastUpdated: override.lastUpdated,
sourceName: override.sourceName ?? sourceName,
sourceUrl: override.sourceUrl ?? sourceUrl,
});
return;
}


// 4) Final fallback: props only
if (!cancelled) {
setData({ cases, statesAffected, hospitalizations, deaths, lastUpdated, sourceName, sourceUrl });
}
}


load();
return () => { cancelled = true; };
}, [dataUrl]);


const d = {
cases: data.cases ?? cases,
statesAffected: data.statesAffected ?? statesAffected,
hospitalizations: data.hospitalizations ?? hospitalizations,
deaths: data.deaths ?? deaths,
lastUpdated: data.lastUpdated ?? lastUpdated,
sourceName: data.sourceName ?? sourceName,
sourceUrl: data.sourceUrl ?? sourceUrl,
};


return (
<div className="border-l-4 border-red-600 bg-red-50 p-4 rounded-2xl shadow-sm mb-6">
<div className="flex items-start justify-between gap-4">
<div>
<h3 className="font-semibold text-red-700">
{title} — {region}
</h3>
<p className="text-sm mt-1">
{typeof d.cases === "number" ? (<>
<strong>{d.cases.toLocaleString()}</strong> confirmed cases
</>) : (<>Current cases: <em>n/a</em></>)}
{typeof d.statesAffected === "number" && (
<> across <strong>{d.statesAffected}</strong> states</>
)}
.
</p>
<ul className="text-sm mt-2 list-disc ml-5">
{typeof d.hospitalizations === "number" && (
<li>Hospitalizations: <strong>{d.hospitalizations.toLocaleString()}</strong></li>
)}
{typeof d.deaths === "number" && (
<li>Deaths: <strong>{d.deaths.toLocaleString()}</strong></li>
)}
</ul>
<p className="text-xs text-gray-600 mt-2">
{d.lastUpdated ? <>Last updated {new Date(d.lastUpdated).toLocaleDateString()}</> : <>Last updated: —</>} · Source: {d.sourceUrl ? (<a href={d.sourceUrl} className="underline" rel="noopener noreferrer">{d.sourceName}</a>) : d.sourceName}
</p>
</div>
</div>
</div>
);
}